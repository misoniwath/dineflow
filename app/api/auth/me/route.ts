import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      // No token means guest or logged out — return success with null user
      return NextResponse.json({ success: true, user: null });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ success: true, user: null });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: payload.id,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch {
    return NextResponse.json({ success: true, user: null });
  }
}
