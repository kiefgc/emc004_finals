import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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

    const decoded = jwt.verify(auth_token.value, process.env.JWT_SECRET) as {
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
        items: { include: { product: true } },
        user: true,
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

  // 1. Authenticate Request
  if (!auth_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(auth_token.value, process.env.JWT_SECRET) as {
      id: string;
      role: string;
    };

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // 2. Parse and Validate Body
    const { status } = await req.json();
    const validAdminStatuses = ["confirmed", "delivered", "cancelled"];

    // 3. Process DB Updates and Permissions inside Transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!existingOrder) {
        throw Object.assign(new Error("Order not found"), { code: "P2025" });
      }

      // --- AUTHORIZATION MATRIX ---
      const isAdmin = decoded.role === "ADMIN";
      const isOwner = existingOrder.userId === decoded.id;

      if (isAdmin) {
        // Admins must supply a valid admin status
        if (!status || !validAdminStatuses.includes(status)) {
          throw new Error("BAD_REQUEST: Invalid status for admin.");
        }
      } else if (isOwner) {
        // Users can ONLY change status to 'cancelled'
        if (status !== "cancelled") {
          throw new Error(
            "FORBIDDEN: Users are only permitted to cancel orders.",
          );
        }
        // Users can't cancel an order that is already shipped/completed
        if (
          existingOrder.status === "delivered" ||
          existingOrder.status === "confirmed"
        ) {
          throw new Error(
            "BAD_REQUEST: Cannot cancel an order that has already been processed or delivered.",
          );
        }
      } else {
        // Neither Admin nor Owner
        throw new Error("FORBIDDEN: Not authorized to modify this order.");
      }
      // ----------------------------------------

      // Only restock if transitioning INTO "cancelled"
      const isNewlyCancelled =
        status === "cancelled" && existingOrder.status !== "cancelled";

      if (isNewlyCancelled) {
        for (const item of existingOrder.items) {
          if (item.productId === null) continue;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
      });
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error: any) {
    console.error(error);

    // Translate our custom transaction validation errors to HTTP Responses
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
