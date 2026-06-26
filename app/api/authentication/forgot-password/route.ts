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

    let generatedToken: string | null = null;

    if (user) {
      generatedToken = randomUUID();
      const expiresAt = new Date(Date.now() + 3600000);

      await prisma.passwordResetToken.create({
        data: { email, token: generatedToken, expiresAt },
      });

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${generatedToken}&email=${email}`;

      console.log(`[QA ONLY] Password reset link for ${email}: ${resetLink}`);
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Reset token created",
      token: generatedToken,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
