import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
interface JWTPayload {
  userId?: string;
  id?: string;
  sub?: string;
  role?: string;
}

const verifyJwtAsync = (token: string, secret: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded as JWTPayload);
    });
  });
};

async function authorizeUser(): Promise<{ userId: string } | NextResponse> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  if (!authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await verifyJwtAsync(authToken, process.env.JWT_SECRET!);
    const userId = decoded.userId || decoded.id || decoded.sub;
    const role = decoded.role;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token payload format" },
        { status: 401 },
      );
    }

    if (role !== "USER") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to standard users" },
        { status: 403 },
      );
    }

    return { userId };
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET(req: Request) {
  try {
    const authResult = await authorizeUser();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const cartData = await prisma.shoppingCart.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                priceCents: true,
                stockQuantity: true,
                imageUrl: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (cartData) {
      return NextResponse.json(cartData, { status: 200 });
    }

    const newCart = await prisma.shoppingCart.create({
      data: { userId },
      select: {
        id: true,
        userId: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
          },
        },
      },
    });
    return NextResponse.json(newCart, { status: 200 });
  } catch (error) {
    console.error("CRITICAL API ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const { productId, quantity, mode = "increment" } = body;

    if (
      typeof productId !== "number" ||
      typeof quantity !== "number" ||
      !Number.isInteger(productId) ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !["increment", "set"].includes(mode)
    ) {
      return NextResponse.json(
        { error: "Invalid productId, quantity, or mode" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.shoppingCart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { id: true },
      });

      const whereKey = {
        unique_cart_item: {
          cartId: cart.id,
          productId,
        },
      };

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stockQuantity: true },
      });

      if (!product) return { error: "Product not found", status: 404 };

      const existingCartItem = await tx.cartItem.findUnique({
        where: whereKey,
        select: { quantity: true },
      });

      const existingQuantity = existingCartItem?.quantity || 0;
      const newTotalQuantity =
        mode === "set" ? quantity : existingQuantity + quantity;

      if (newTotalQuantity > product.stockQuantity) {
        return {
          error: `Insufficient stock available. Only ${product.stockQuantity} remaining.`,
          status: 400,
        };
      }

      const cartItem = await tx.cartItem.upsert({
        where: whereKey,
        create: {
          cartId: cart.id,
          productId,
          quantity: newTotalQuantity,
        },
        update: {
          quantity: newTotalQuantity,
        },
      });

      return { data: cartItem, status: 200 };
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      message: "Cart updated successfully",
      cartItem: result.data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
