import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0), // Set date to 1970 to expire the cookie immediately
  });

  return NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 },
  );
}
