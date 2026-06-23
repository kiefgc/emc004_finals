import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get("auth_token")?.value;

        if (!authToken) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        let userId: string;
        try {
            const decoded = jwt.verify(authToken, process.env.JWT_SECRET!) as {
                userId?: string;
                id?: string;
                sub?: string;
            };
            userId = decoded.userId || decoded.id || decoded.sub || "";

            if (!userId) {
                return NextResponse.json(
                    { error: "Unauthorized: Invalid token payload format" },
                    { status: 401 },
                );
            }
        } catch (error) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const cartData = await prisma.shoppingCart.findUnique({
            where: { userId },
            include: { items: { include: { product: true } } },
        });

        if (cartData) {
            return NextResponse.json(cartData, { status: 200 });
        } else {
            const newCart = await prisma.shoppingCart.create({
                data: {
                    userId,
                },
                include: { items: { include: { product: true } } },
            });
            return NextResponse.json(newCart, { status: 200 });
        }
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
        const cookieStore = await cookies();
        const authTokenCookie = cookieStore.get("auth_token");

        if (!authTokenCookie) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        let decoded: any;

        try {
            decoded = jwt.verify(
                authTokenCookie.value,
                process.env.JWT_SECRET!,
            );
        } catch {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const userId = decoded?.id;

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { productId, quantity } = body;

        if (
            typeof productId !== "number" ||
            typeof quantity !== "number" ||
            !Number.isInteger(productId) ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return NextResponse.json(
                { error: "Invalid productId or quantity" },
                { status: 400 },
            );
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 },
            );
        }

        if (quantity > product.stockQuantity) {
            return NextResponse.json(
                { error: "Insufficient stock" },
                { status: 400 },
            );
        }

        const cart = await prisma.shoppingCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });

        const whereKey = {
            unique_cart_item: {
                cartId: cart.id,
                productId,
            },
        };

        const cartItem = await prisma.cartItem.upsert({
            where: whereKey,
            create: {
                cartId: cart.id,
                productId,
                quantity,
            },
            update: {
                quantity,
            },
        });

        return NextResponse.json({
            message: "Cart updated successfully",
            cartItem,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
