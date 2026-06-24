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
      role: string;
    };

    // 2. Authorization Check (Admin only)
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // 3. Parse and Validate Body
    const { status } = await req.json();
    const validStatuses = ["confirmed", "delivered", "cancelled"];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // 4. Update Order Status (+ restock inventory if cancelling)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!existingOrder) {
        // Let the outer catch translate this into a 404 via the same
        // "not found" message used below, keeping behavior consistent.
        throw Object.assign(new Error("Order not found"), { code: "P2025" });
      }

      // Only restock if we're transitioning INTO "cancelled" from some
      // other status. This guards against double-restocking if an already
      // cancelled order is "cancelled" again.
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

    // Handle specific Prisma error for missing record (and our own
    // manually-thrown "Order not found" above)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
