import { db } from "@/lib/db/index";
import { floorTables } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function seedFloorPlan() {
  console.log("🌱 Seeding floor tables...");

  const initialTables = [
    {
      number: 1,
      seats: 2,
      shape: "round",
      zone: "main_hall",
      x: 14,
      y: 26,
      status: "occupied",
      guests: 2,
    },
    {
      number: 2,
      seats: 2,
      shape: "round",
      zone: "main_hall",
      x: 14,
      y: 56,
      status: "free",
      guests: 0,
    },
    {
      number: 3,
      seats: 4,
      shape: "square",
      zone: "main_hall",
      x: 38,
      y: 26,
      status: "reserved",
      guests: 0,
    },
    {
      number: 4,
      seats: 4,
      shape: "square",
      zone: "main_hall",
      x: 38,
      y: 56,
      status: "occupied",
      guests: 3,
    },
    {
      number: 5,
      seats: 6,
      shape: "rect",
      zone: "main_hall",
      x: 68,
      y: 28,
      status: "free",
      guests: 0,
    },
    {
      number: 6,
      seats: 6,
      shape: "rect",
      zone: "main_hall",
      x: 68,
      y: 60,
      status: "occupied",
      guests: 5,
    },
    {
      number: 7,
      seats: 4,
      shape: "square",
      zone: "main_hall",
      x: 38,
      y: 82,
      status: "free",
      guests: 0,
    },
    {
      number: 8,
      seats: 4,
      shape: "round",
      zone: "patio",
      x: 24,
      y: 36,
      status: "reserved",
      guests: 0,
    },
    {
      number: 9,
      seats: 4,
      shape: "round",
      zone: "patio",
      x: 52,
      y: 62,
      status: "free",
      guests: 0,
    },
    {
      number: 10,
      seats: 4,
      shape: "round",
      zone: "patio",
      x: 78,
      y: 34,
      status: "occupied",
      guests: 3,
    },
    {
      number: 11,
      seats: 2,
      shape: "round",
      zone: "bar",
      x: 24,
      y: 55,
      status: "free",
      guests: 0,
    },
    {
      number: 12,
      seats: 2,
      shape: "round",
      zone: "bar",
      x: 50,
      y: 55,
      status: "free",
      guests: 0,
    },
  ];

  for (const table of initialTables) {
    const [existing] = await db
      .select()
      .from(floorTables)
      .where(eq(floorTables.number, table.number))
      .limit(1);

    if (!existing) {
      await db.insert(floorTables).values(table);
    }
  }

  console.log("✅ Floor plan seeded.");
}
