import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

// Async JWT Helper to keep Node's event loop completely clear under load
const verifyJwtAsync = (token: string, secret: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get("auth_token");

    if (!authTokenCookie || !authTokenCookie.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authTokenCookie.value;
    let decoded: { id: string };

    try {
      decoded = (await verifyJwtAsync(token, process.env.JWT_SECRET!)) as {
        id: string;
      };
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // OPTIMIZATION: Use sharp sub-selectors to bypass heavy table relation inclusion loads
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        role: {
          select: { name: true },
        },
      },
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

    let price =
      body.price !== undefined
        ? body.price
        : body.priceCents !== undefined
          ? body.priceCents / 100
          : undefined;
    let stock = body.stock !== undefined ? body.stock : body.stockQuantity;

    if (price === undefined && stock === undefined) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    if (price !== undefined) {
      if (typeof price !== "number" || price < 0) {
        return NextResponse.json(
          { error: "Invalid price field" },
          { status: 400 },
        );
      }

      // OPTIMIZATION: Swapped regex check for high-speed arithmetic decimal step logic
      if (Math.floor(price * 100) !== Math.round(price * 100)) {
        return NextResponse.json(
          { error: "Price cannot have more than 2 decimal places" },
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
    // For PATCH handler
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authTokenCookie.value;
    let decoded: { id: string };

    try {
      decoded = (await verifyJwtAsync(token, process.env.JWT_SECRET!)) as {
        id: string;
      };
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // OPTIMIZATION: Maintain lean, fast query footprint for authentication validations
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        role: {
          select: { name: true },
        },
      },
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

    await prisma.product.delete({
      where: { id: numericId },
    });

    return NextResponse.json(
      { message: "Product successfully deleted" },
      { status: 200 },
    );
    // For DELETE handler
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
            error:
              "Cannot delete product because it is tied to active order history",
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
}
