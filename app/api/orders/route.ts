import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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

    const decoded = jwt.verify(auth_token.value, process.env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    const userId = decoded.id;

    const shoppingCart = await prisma.shoppingCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!shoppingCart || shoppingCart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const tx = await prisma.$transaction(async (tx) => {
      let totalAmountCents = 0;

      for (const item of shoppingCart.items) {
        const currentProduct = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!currentProduct) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (item.quantity > currentProduct.stockQuantity) {
          throw new Error(
            `Insufficient stock for product ${currentProduct.name}`,
          );
        }

        totalAmountCents += item.quantity * currentProduct.priceCents;
      }

      const order = await tx.order.create({
        data: {
          userId,
          totalAmountCents,
        },
      });

      await tx.orderItem.createMany({
        data: shoppingCart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchaseCents: item.product.priceCents,
        })),
      });

      for (const item of shoppingCart.items) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: shoppingCart.id,
        },
      });

      return order;
    });

    return NextResponse.json(
      {
        message: "Order placed successfully",
        orderId: tx.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    if (
      error instanceof Error &&
      error.message.startsWith("Insufficient stock")
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

    const decoded = jwt.verify(auth_token.value, process.env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    const userId = decoded.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let orders;

    if (user.role.name === "ADMIN") {
      orders = await prisma.order.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
    } else if (user.role.name === "CUSTOMER") {
      orders = await prisma.order.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(orders, {
      status: 200,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
