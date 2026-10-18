import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
const bcrypt = require("bcrypt");

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { UpdateUserBody } from "@/types/User";

function sanitizeUser(row: typeof users.$inferSelect) {
  // Remove sensitive fields like passwordHash before returning the user object
  const { passwordHash, ...safe } = row;
  return safe;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const row = await db
    .select()
    .from(users)
    .where(eq(users.id, params.id))
    .limit(1);

  if (!row[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(sanitizeUser(row[0]));
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json()) as UpdateUserBody;
    const { id } = await params;

    const updateData: Partial<typeof users.$inferInsert> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined)
      updateData.email = body.email.trim().toLowerCase();
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.lastLoginAt !== undefined) {
      updateData.lastLoginAt = body.lastLoginAt
        ? new Date(body.lastLoginAt)
        : null;
    }
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(sanitizeUser(updated[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { id } = await params;
  // Soft delete: isActive = false
  const updated = await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
