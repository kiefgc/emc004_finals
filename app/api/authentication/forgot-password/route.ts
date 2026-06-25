// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 3600000);

      await prisma.passwordResetToken.create({
        data: { email, token, expiresAt },
      });

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&email=${email}`;

      console.log(`[QA ONLY] Password reset link for ${email}: ${resetLink}`);
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been generated.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
