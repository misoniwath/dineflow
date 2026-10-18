import { db } from "@/lib/db/index";
import { menuItems, menuInventoryItems, inventoryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function seedMenuItems() {
  console.log("🌱 Seeding menu items...");

  const seedMenuItems = [
    {
      name: "Charred shishito peppers",
      price: 900,
      image: "/images/s1.jpg",
      desc: "Smoky, charred peppers with sea salt",
      category: "Starters",
      ingredients: [
        { inventoryItemName: "Shishito peppers", quantityRequired: 0.5 },
      ],
    },
    {
      name: "Burrata & heirloom tomato",
      price: 1200,
      image: "/images/s2.jpg",
      desc: "Creamy burrata, ripe tomatoes, basil",
      category: "Starters",
      ingredients: [
        { inventoryItemName: "Burrata", quantityRequired: 1 },
        { inventoryItemName: "Heirloom tomato", quantityRequired: 0.3 },
      ],
    },
    {
      name: "Soup of the day",
      price: 700,
      image: "/images/s3.jpg",
      desc: "Ask your server for today's selection",
      category: "Starters",
      ingredients: [],
    },
  ];

  // 1. Fetch all inventory items from the database to map names to generated IDs
  const allInventory = await db.select().from(inventoryItems);
  const inventoryIdMap = new Map<string, string>();
  for (const inv of allInventory) {
    inventoryIdMap.set(inv.name, inv.id);
  }

  // 2. Iterate and seed menu items
  for (const item of seedMenuItems) {
    const { ingredients, ...menuData } = item;

    // Check if menu item exists by name
    const [existing] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.name, menuData.name))
      .limit(1);

    let menuItemId: string;

    if (!existing) {
      const [inserted] = await db
        .insert(menuItems)
        .values(menuData)
        .returning({ id: menuItems.id });

      menuItemId = inserted.id;
    } else {
      menuItemId = existing.id;
      await db
        .update(menuItems)
        .set(menuData)
        .where(eq(menuItems.id, menuItemId));
    }

    // 3. Clear existing junction mappings for a clean sync
    await db
      .delete(menuInventoryItems)
      .where(eq(menuInventoryItems.menuItemId, menuItemId));

    // 4. Map ingredient names to database IDs and insert into junction table
    if (ingredients && ingredients.length > 0) {
      const junctionValues = ingredients.map((ing) => {
        const inventoryItemId = inventoryIdMap.get(ing.inventoryItemName);

        if (!inventoryItemId) {
          throw new Error(
            `Inventory item "${ing.inventoryItemName}" not found in database for recipe "${menuData.name}". Ensure inventory is seeded first.`,
          );
        }

        return {
          menuItemId,
          inventoryItemId,
          quantityRequired: ing.quantityRequired,
        };
      });

      await db.insert(menuInventoryItems).values(junctionValues);
    }
  }

  console.log("✅ Menu items and recipes seeded successfully.");
}
