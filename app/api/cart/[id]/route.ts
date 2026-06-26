import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma"; // Adjust path if necessary

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token");

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(authToken.value, process.env.JWT_SECRET!);
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

    // 1. Security Check: Fetch the item and include the parent cart relation
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true, // Matches your schema relation name
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 },
      );
    }

    // 2. Validate ownership to prevent cross-user deletion attempts
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to this cart item" },
        { status: 403 },
      );
    }

    // 3. Directly delete using the CartItem's primary key ID
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return NextResponse.json({
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
