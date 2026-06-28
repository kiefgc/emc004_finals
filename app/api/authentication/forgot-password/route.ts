import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    let generatedToken: string | null = null;

    if (user) {
      generatedToken = randomUUID();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { email, token: generatedToken, expiresAt },
      });

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${generatedToken}&email=${email}`;
      console.log(`[QA ONLY] Password reset link for ${email}: ${resetLink}`);
    }

    return NextResponse.json(
      {
        message:
          "If your email is registered in our system, you will receive a reset link shortly.",
        ...(process.env.NODE_ENV === "test" && { token: generatedToken }), // Only expose token back to tests if mocking email dispatchers
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
