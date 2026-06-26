import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const auth_token = cookieStore.get("auth_token");

  if (!auth_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(
      auth_token.value,
      process.env.JWT_SECRET,
    ) as JWTPayload;
    const userId = decoded.id;

    const body = await req.json().catch(() => null);
    const shippingAddress = body?.shippingAddress;
    const contactPhone = body?.contactPhone;

    if (
      typeof shippingAddress !== "string" ||
      shippingAddress.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "shippingAddress is required" },
        { status: 400 },
      );
    }

    if (typeof contactPhone !== "string" || contactPhone.trim().length === 0) {
      return NextResponse.json(
        { error: "contactPhone is required" },
        { status: 400 },
      );
    }

    // 1. Fetch the shopping cart with its items
    const shoppingCart = await prisma.shoppingCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!shoppingCart || shoppingCart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Execute database mutations inside a transaction to ensure integrity
    const placedOrder = await prisma.$transaction(async (tx) => {
      const productIds = shoppingCart.items.map((item) => item.productId);

      const dbProducts = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
      });

      // Map products by ID for fast O(1) lookups in memory
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));
      let totalAmountCents = 0;

      // 2. Validate quantities and stock in-memory using the mapped data
      for (const item of shoppingCart.items) {
        const currentProduct = productMap.get(item.productId);

        if (!currentProduct) {
          throw new Error(
            `Product ${item.productId} not found or no longer available`,
          );
        }

        if (item.quantity <= 0) {
          throw new Error(
            `Invalid quantity for product ${currentProduct.name}`,
          );
        }

        if (item.quantity > currentProduct.stockQuantity) {
          throw new Error(
            `Insufficient stock for product ${currentProduct.name}`,
          );
        }

        totalAmountCents += item.quantity * currentProduct.priceCents;
      }

      // 3. Create the order record (Database will apply the default "PENDING" status automatically)
      const order = await tx.order.create({
        data: {
          userId,
          totalAmountCents,
          customerEmail: decoded.email,
          shippingAddress,
          contactPhone,
        },
      });

      // 4. Batch insert all order items at once
      await tx.orderItem.createMany({
        data: shoppingCart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchaseCents: item.product.priceCents,
        })),
      });

      // 5. Update stock quantities
      // Note: While this still runs loops, it only handles updates, which cannot be grouped cleanly
      // without raw SQL or a bulk-update strategy if your DB engine supports it.
      for (const item of shoppingCart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
      }

      // 6. Clear the shopping cart items
      await tx.cartItem.deleteMany({
        where: { cartId: shoppingCart.id },
      });

      return order;
    });

    return NextResponse.json(
      {
        message: "Order placed successfully",
        order: placedOrder,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    if (
      error instanceof Error &&
      (error.message.startsWith("Insufficient stock") ||
        error.message.startsWith("Invalid quantity") ||
        error.message.includes("not found"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const auth_token = cookieStore.get("auth_token");

  if (!auth_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(
      auth_token.value,
      process.env.JWT_SECRET,
    ) as JWTPayload;

    let orders;

    if (decoded.role === "ADMIN") {
      orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: true },
          },
          user: {
            select: { id: true, email: true },
          },
        },
      });
    } else if (decoded.role === "USER") {
      orders = await prisma.order.findMany({
        where: { userId: decoded.id },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: true },
          },
        },
      });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
