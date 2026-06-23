import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    const secretKey = process.env.JWT_SECRET!;

    try {
        let token = req.headers.get("Authorization")?.split(" ")[1] || null;

        if (!token) {
            const cookieHeader = req.headers.get("cookie");
            if (cookieHeader) {
                const tokenCookie = cookieHeader
                    .split(";")
                    .map((c) => c.trim())
                    .find((c) => c.startsWith("token="));
                if (tokenCookie) {
                    token = tokenCookie.split("=")[1];
                }
            }
        }

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Verify the JWT token
        const decodedToken = jwt.verify(token, secretKey) as { userId: string };

        // Fetch user's shopping cart
        const cart = await prisma.shoppingCart.findUnique({
            where: { userId: decodedToken.userId },
            include: { items: { include: { product: true } } },
        });

        if (!cart || cart.items.length === 0) {
            return NextResponse.json(
                { error: "Cart is empty" },
                { status: 400 },
            );
        }

        // Begin transaction
        const order = await prisma.$transaction(async (tx) => {
            let totalAmountCents = 0;

            for (const item of cart.items) {
                if (item.quantity > item.product.stockQuantity) {
                    throw new Error("Insufficient stock");
                }
                totalAmountCents += item.quantity * item.product.priceCents;
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stockQuantity: { decrement: item.quantity } },
                });
            }

            const newOrder = await tx.order.create({
                data: {
                    userId: decodedToken.userId,
                    totalAmountCents,
                    status: "pending",
                    items: {
                        createMany: {
                            data: cart.items.map((item) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                priceAtPurchaseCents: item.product.priceCents,
                            })),
                        },
                    },
                },
            });

            await tx.cartItem.deleteMany({
                where: { cartId: cart.id },
            });

            return newOrder;
        });

        return NextResponse.json(
            { message: "Order placed successfully", orderId: order.id },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof Error && error.message === "Insufficient stock") {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
