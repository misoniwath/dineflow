import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
const bcrypt = require("bcrypt");
import { cookies } from "next/headers";
import { signToken } from "@/lib/auth/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 },
      );
    }

    // 1. Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.email, email.trim())))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    // 3. Generate JWT containing user info
    const token = await signToken({
      id: user.id,
      role: user.role,
      name: user.name,
    });

    // 4. Set HTTP-only cookie containing the JWT
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    // 5. Return safe user profile
    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      },
      { status: 500 },
    );
  }
}
