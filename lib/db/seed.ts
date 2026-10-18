import { seedUsers } from "@/lib/db/seeders/users.seed";
import { seedMenuItems } from "@/lib/db/seeders/menu.seed";
import { seedInventory } from "@/lib/db/seeders/inventory.seed";

async function main() {
  console.log("🚀 Starting database seeding workflow...");

  await seedUsers();
  await seedInventory();
  await seedMenuItems();

  console.log("🎉 All seeders completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
