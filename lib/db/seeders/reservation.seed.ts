import { db } from "@/lib/db/index";
import { reservations, floorTables } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function seedReservations() {
  console.log("🌱 Seeding reservations...");

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // 1. Fetch all floor tables to map their numbers to their database UUIDs/IDs
  const tables = await db.select().from(floorTables);
  const tableMap = new Map(tables.map((t) => [t.number, t.id]));

  // 2. Define initial reservations referencing table numbers
  const initialReservations: any[] = [
    {
      name: "Dara Chhun",
      phone: "",
      party: 4,
      date: today,
      time: "18:30",
      notes: "Window if possible",
      status: "booked",
      tableNumber: 3, // Maps to Table 3
    },
    {
      name: "Sophea Lim",
      phone: "",
      party: 2,
      date: today,
      time: "19:00",
      notes: "",
      status: "booked",
      tableNumber: 8, // Maps to Table 8
    },
    {
      name: "Kosal Pich",
      phone: "",
      party: 6,
      date: today,
      time: "20:15",
      notes: "Birthday dessert",
      status: "booked",
      tableNumber: null, // Unassigned
    },
    {
      name: "Vanna Sok",
      phone: "",
      party: 2,
      date: today,
      time: "17:30",
      notes: "",
      status: "seated",
      tableNumber: 1, // Maps to Table 1
    },
    {
      name: "Chenda Roth",
      phone: "",
      party: 5,
      date: tomorrow,
      time: "19:30",
      notes: "",
      status: "booked",
      tableNumber: null, // Unassigned
    },
    {
      name: "Sreyneang Heng",
      phone: "",
      party: 8,
      date: tomorrow,
      time: "18:00",
      notes: "High chair needed",
      status: "booked",
      tableNumber: null,
    },
  ];

  // 3. Insert reservations with dynamically mapped table IDs if none exist yet
  for (const res of initialReservations) {
    const resolvedTableId =
      res.tableNumber !== null ? (tableMap.get(res.tableNumber) ?? null) : null;

    // Check if a reservation with the exact same details already exists to prevent duplication
    const [existing] = await db
      .select()
      .from(reservations)
      .where(
        sql`${reservations.name} = ${res.name} AND ${reservations.date} = ${res.date} AND ${reservations.time} = ${res.time}`,
      )
      .limit(1);

    if (!existing) {
      await db.insert(reservations).values({
        name: res.name,
        phone: res.phone,
        party: res.party,
        date: res.date,
        time: res.time,
        notes: res.notes,
        status: res.status,
        tableId: resolvedTableId,
      });
    }
  }

  console.log("✅ Reservations seeded.");
}
