import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Email and password must be strings" },
        { status: 400 },
      );
    }

    const passwordRegex = /^(?=.*[^A-Za-z0-9])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(body.password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long, contain a number, and a special character.",
        },
        { status: 400 },
      );
    }

    const trimmedEmail = body.email.trim();
    const trimmedPassword = body.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return NextResponse.json(
        { error: "Email and password cannot be empty" },
        { status: 400 },
      );
    }

    if (trimmedEmail.length > 255) {
      return NextResponse.json(
        { error: "Email must be 255 characters or less" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (trimmedPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    if (trimmedPassword.length > 72) {
      return NextResponse.json(
        { error: "Password cannot exceed 72 characters" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    const saltRounds = process.env.NODE_ENV === "test" ? 4 : 10;
    const hashedPassword = await bcryptjs.hash(trimmedPassword, saltRounds);

    const role = await prisma.role.findFirst({
      where: { name: "USER" },
      select: { id: true },
    });

    if (!role) {
      return NextResponse.json(
        { error: "System configuration error: USER role missing" },
        { status: 500 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash: hashedPassword,
        roleId: role.id,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: "User registered successfully", userId: user.id },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
