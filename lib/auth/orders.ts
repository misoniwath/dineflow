import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";

export class OrderAccessError extends Error {
  readonly status = 401;
}

export async function requireOrderStaff() {
  const token = (await cookies()).get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (typeof payload?.id !== "string") {
    throw new OrderAccessError("Please sign in to manage kitchen orders.");
  }
  const [user] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.id))
    .limit(1);
  if (!user?.isActive) {
    throw new OrderAccessError("Please sign in to manage kitchen orders.");
  }
  return user;
}
