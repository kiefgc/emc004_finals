import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const passwordRegex = /^(?=.*[^A-Za-z0-9])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long, contain a number, and a special character.",
        },
        { status: 400 },
      );
    }

    const resetEntry = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        expiresAt: true,
      },
    });

    if (
      !resetEntry ||
      resetEntry.email !== email ||
      resetEntry.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const saltRounds = process.env.NODE_ENV === "test" ? 4 : 12;
    const passwordHash = await bcryptjs.hash(newPassword, saltRounds);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetEntry.id },
      }),
    ]);

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset password database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
