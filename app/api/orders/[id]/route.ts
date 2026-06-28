import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const verifyJwtAsync = (token: string, secret: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const auth_token = cookieStore.get("auth_token");

  if (!auth_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = (await verifyJwtAsync(
      auth_token.value,
      process.env.JWT_SECRET,
    )) as {
      id: string;
      email: string;
      role: string;
    };

    const { id } = await params;
    const userId = decoded.id;
    const roleName = decoded.role;

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            priceAtPurchaseCents: true,
            product: {
              select: { id: true, name: true, imageUrl: true },
            },
          },
        },
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.userId === userId;
    const isAdmin = roleName === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const auth_token = cookieStore.get("auth_token");

  if (!auth_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = (await verifyJwtAsync(
      auth_token.value,
      process.env.JWT_SECRET,
    )) as {
      id: string;
      role: string;
    };

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const { status } = await req.json();
    const validAdminStatuses = ["confirmed", "delivered", "cancelled"];

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          userId: true,
          status: true,
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw Object.assign(new Error("Order not found"), { code: "P2025" });
      }

      const isAdmin = decoded.role === "ADMIN";
      const isOwner = existingOrder.userId === decoded.id;

      if (isAdmin) {
        if (!status || !validAdminStatuses.includes(status)) {
          throw new Error("BAD_REQUEST: Invalid status for admin.");
        }
      } else if (isOwner) {
        if (status !== "cancelled") {
          throw new Error(
            "FORBIDDEN: Users are only permitted to cancel orders.",
          );
        }
        if (
          existingOrder.status === "delivered" ||
          existingOrder.status === "confirmed"
        ) {
          throw new Error(
            "BAD_REQUEST: Cannot cancel an order that has already been processed or delivered.",
          );
        }
      } else {
        throw new Error("FORBIDDEN: Not authorized to modify this order.");
      }

      const isNewlyCancelled =
        status === "cancelled" && existingOrder.status !== "cancelled";

      if (isNewlyCancelled) {
        await Promise.all(
          existingOrder.items
            .filter((item) => item.productId !== null)
            .map((item) =>
              tx.product.update({
                where: { id: item.productId! },
                data: { stockQuantity: { increment: item.quantity } },
              }),
            ),
        );
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
      });
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error: any) {
    console.error(error);

    if (error.message?.startsWith("FORBIDDEN")) {
      return NextResponse.json(
        { error: error.message.split(": ")[1] },
        { status: 403 },
      );
    }
    if (error.message?.startsWith("BAD_REQUEST")) {
      return NextResponse.json(
        { error: error.message.split(": ")[1] },
        { status: 400 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
