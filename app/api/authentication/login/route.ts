import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
        });

        // Clean check for user presence AND existence of password hash (prevents bcrypt crash)
        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 },
            );
        }

        const isPasswordValid = await bcryptjs.compare(
            password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 },
            );
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role.name },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" },
        );

        // Properly await the cookies store
        const cookieStore = await cookies();
        cookieStore.set({
            name: "auth_token",
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/", // Ensure it applies globally across the app
        });

        return NextResponse.json({ message: "Login successful" });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
