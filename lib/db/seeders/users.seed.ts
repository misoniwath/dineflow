import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
const bcrypt = require("bcrypt");

export async function seedUsers() {
  console.log("🌱 Seeding users...");

  const saltRounds = 10;
  const staffPasswordHash = await bcrypt.hash("staff123", saltRounds);
  const managerPasswordHash = await bcrypt.hash("manager123", saltRounds);
  const ownerPasswordHash = await bcrypt.hash("owner123", saltRounds);

  const seedUsers = [
    {
      name: "Sokha",
      email: "staff@dineflow.test",
      passwordHash: staffPasswordHash,
      role: "staff" as const,
      isActive: true,
    },
    {
      name: "Dara",
      email: "manager@dineflow.test",
      passwordHash: managerPasswordHash,
      role: "manager" as const,
      isActive: true,
    },
    {
      name: "Huyming",
      email: "owner@dineflow.test",
      passwordHash: ownerPasswordHash,
      role: "owner" as const,
      isActive: true,
    },
  ];

  for (const user of seedUsers) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, user.email.toLowerCase()))
      .limit(1);

    if (!existing) {
      await db.insert(users).values(user);
    }
  }
  console.log("✅ Users seeded.");
}
