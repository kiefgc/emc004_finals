import { NextResponse } from "next/server";
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sortBy = url.searchParams.get("sortBy") || null;
    const order = url.searchParams.get("order") || null;

    let finalSortBy: "name" | "createdAt" = "name";
    if (["name", "createdAt"].includes(sortBy as string)) {
      finalSortBy = sortBy as "name" | "createdAt";
    }

    let finalOrder: "asc" | "desc" = "asc";
    if (["asc", "desc"].includes(order as string)) {
      finalOrder = order as "asc" | "desc";
    }

    const orderBy = { [finalSortBy]: finalOrder };

    const products = await prisma.product.findMany({
      orderBy: orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        stockQuantity: true,
        imageUrl: true,
      },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { name, description, price, stock, supplierName, imageUrl } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Invalid or missing fields" },
        { status: 400 },
      );
    }

    if (typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Invalid or missing fields" },
        { status: 400 },
      );
    }

    if (Math.floor(price * 100) !== Math.round(price * 100)) {
      return NextResponse.json(
        { error: "Price cannot have more than 2 decimal places" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json(
        { error: "Invalid or missing fields" },
        { status: 400 },
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: { name },
      select: { id: true },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Product name already exists" },
        { status: 400 },
      );
    }

    const newPriceCents = Math.round(price * 100);
    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        priceCents: newPriceCents,
        stockQuantity: stock,
        supplierName: supplierName?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("PRODUCT_POST_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
