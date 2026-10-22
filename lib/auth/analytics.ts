import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";

export class AnalyticsAccessError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
    this.name = "AnalyticsAccessError";
  }
}

export async function requireAnalyticsManager() {
  const token = (await cookies()).get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (typeof payload?.id !== "string") {
    throw new AnalyticsAccessError(401, "Please sign in to view Analytics.");
  }
  const [user] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.id))
    .limit(1);
  if (!user?.isActive) {
    throw new AnalyticsAccessError(401, "Please sign in to view Analytics.");
  }
  if (user.role !== "manager" && user.role !== "owner") {
    throw new AnalyticsAccessError(
      403,
      "Only managers and owners can view Analytics.",
    );
  }
  return user;
}
