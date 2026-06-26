import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate email and password fields
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

    // Check if user already exists with the supplied email
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    // Hash password using bcryptjs
    const hashedPassword = await bcryptjs.hash(trimmedPassword, 10);

    // Query the Role table where `name = "USER"`
    const role = await prisma.role.findFirst({
      where: {
        name: "USER",
      },
    });

    if (!role) {
      throw new Error("USER role is missing");
    }

    // Create the user record using `prisma.user.create`
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash: hashedPassword,
        roleId: role.id,
      },
    });

    return NextResponse.json(
      { message: "User registered successfully", userId: user.id },
      { status: 201 },
    );
  } catch (error) {
    // Return HTTP 500 for unexpected failures
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
