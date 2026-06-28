import { NextRequest, NextResponse } from "next/server";
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");

    if (!authToken || !authToken.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { id: string };
    try {
      decoded = (await verifyJwtAsync(
        authToken.value,
        process.env.JWT_SECRET!,
      )) as { id: string };
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = decoded?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cartItemId = parseInt(id, 10);

    if (isNaN(cartItemId)) {
      return NextResponse.json(
        { error: "Invalid cart item ID format" },
        { status: 400 },
      );
    }

    const deleteResult = await prisma.cartItem.deleteMany({
      where: {
        id: cartItemId,
        cart: {
          userId: userId,
        },
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: "Cart item not found or unauthorized access" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Item removed from cart",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
