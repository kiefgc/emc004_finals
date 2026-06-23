import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get("auth_token");

        if (!authToken) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        let decoded: any;

        try {
            decoded = jwt.verify(authToken.value, process.env.JWT_SECRET!);
        } catch {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const userId = (decoded as any)?.id;

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { id } = await params;

        const productId = parseInt(id, 10);

        if (isNaN(productId)) {
            return NextResponse.json(
                { error: "Invalid product ID format" },
                { status: 400 },
            );
        }

        const userCart = await prisma.shoppingCart.findUnique({
            where: { userId },
        });

        if (!userCart) {
            return NextResponse.json(
                { error: "Cart not found" },
                { status: 404 },
            );
        }

        await prisma.cartItem.delete({
            where: {
                unique_cart_item: {
                    cartId: userCart.id,
                    productId: productId,
                },
            },
        });

        return NextResponse.json({
            message: "Item removed from cart",
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
