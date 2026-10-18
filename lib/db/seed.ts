import { seedUsers } from "@/lib/db/seeders/users.seed";
import { seedMenuItems } from "@/lib/db/seeders/menu.seed";
import { seedInventory } from "@/lib/db/seeders/inventory.seed";
import { seedFloorPlan } from "@/lib/db/seeders/floorplan.seed";
import { seedReservations } from "@/lib/db/seeders/reservation.seed";

async function main() {
  console.log("🚀 Starting database seeding workflow...");

  await seedUsers();
  await seedInventory();
  await seedMenuItems();
  await seedFloorPlan();
  await seedReservations();

  console.log("🎉 All seeders completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
