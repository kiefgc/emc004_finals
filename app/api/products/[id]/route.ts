import { Prisma } from "@prisma/custom";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const cookieStore = await cookies();
        const authTokenCookie = cookieStore.get("auth_token");

        if (!authTokenCookie || !authTokenCookie.value) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const token = authTokenCookie.value;
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                id: string;
            };
        } catch (error) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { role: true },
        });

        if (!user || user.role.name !== "ADMIN") {
            return NextResponse.json(
                { error: "Forbidden: Admin access required" },
                { status: 403 },
            );
        }

        const productId = await params;
        const numericId = parseInt(productId.id, 10);

        if (isNaN(numericId)) {
            return NextResponse.json(
                { error: "Invalid product ID format" },
                { status: 400 },
            );
        }

        const body = await req.json();
        let price = body.price;
        let stock = body.stock;

        if (price === undefined && stock === undefined) {
            return NextResponse.json(
                { error: "No fields provided for update" },
                { status: 400 },
            );
        }

        if (price !== undefined) {
            if (
                typeof price !== "number" ||
                price < 0 ||
                !/^\d+(\.\d{1,2})?$/.test(price.toString())
            ) {
                return NextResponse.json(
                    { error: "Invalid price field" },
                    { status: 400 },
                );
            }
        }

        if (stock !== undefined) {
            if (!Number.isInteger(stock) || stock < 0) {
                return NextResponse.json(
                    { error: "Invalid stock field" },
                    { status: 400 },
                );
            }
        }

        const updateData: { priceCents?: number; stockQuantity?: number } = {};

        if (price !== undefined) {
            updateData.priceCents = Math.round(price * 100);
        }

        if (stock !== undefined) {
            updateData.stockQuantity = stock;
        }

        const updatedProduct = await prisma.product.update({
            where: { id: numericId },
            data: updateData,
        });

        return NextResponse.json(updatedProduct, { status: 200 });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const cookieStore = await cookies();
        const authTokenCookie = cookieStore.get("auth_token");

        if (!authTokenCookie || !authTokenCookie.value) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const token = authTokenCookie.value;
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                id: string;
            };
        } catch (error) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { role: true },
        });

        if (!user || user.role.name !== "ADMIN") {
            return NextResponse.json(
                { error: "Forbidden: Admin access required" },
                { status: 403 },
            );
        }

        const productId = await params;
        const numericId = parseInt(productId.id, 10);
        if (isNaN(numericId)) {
            return NextResponse.json(
                { error: "Invalid product ID format" },
                { status: 400 },
            );
        }

        try {
            await prisma.product.delete({
                where: { id: numericId },
            });

            return NextResponse.json(
                { message: "Product successfully deleted" },
                { status: 200 },
            );
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    return NextResponse.json(
                        { error: "Product not found" },
                        { status: 404 },
                    );
                }
                if (error.code === "P2003") {
                    return NextResponse.json(
                        {
                            error: "Cannot delete product because it is tied to active order history",
                        },
                        { status: 400 },
                    );
                }
            }
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 },
            );
        }
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
