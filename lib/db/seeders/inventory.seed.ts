import { db } from "@/lib/db/index";
import { suppliers, inventoryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function seedInventory() {
  console.log("🌱 Seeding suppliers and inventory items...");

  const seedSuppliers = [
    {
      name: "Bellwood Distributors",
      phone: "555-123-4567",
      email: "bellwood@example.com",
    },
    {
      name: "Coastal Seafood Co.",
      phone: "555-987-6543",
      email: "coastal@example.com",
    },
    {
      name: "Green Valley Farms",
      phone: "555-555-5555",
      email: "green@example.com",
    },
    {
      name: "Milano Dry Goods",
      phone: "555-111-2222",
      email: "milano@example.com",
    },
    {
      name: "Riverside Meats",
      phone: "555-333-4444",
      email: "riverside@example.com",
    },
  ];

  const seedInventoryItems = [
    {
      name: "Arborio rice",
      unit: "lb",
      onHand: 22,
      par: 25,
      lowAt: 8,
      expires: "2027-03-02",
      supplierName: "Milano Dry Goods",
    },
    {
      name: "Burrata",
      unit: "pc",
      onHand: 14,
      par: 20,
      lowAt: 6,
      expires: "2026-10-22",
      supplierName: "Green Valley Farms",
    },
    {
      name: "Chicken breast",
      unit: "lb",
      onHand: 0,
      par: 35,
      lowAt: 10,
      expires: null,
      supplierName: "Riverside Meats",
    },
    {
      name: "Dried pappardelle",
      unit: "lb",
      onHand: 14,
      par: 20,
      lowAt: 6,
      expires: "2027-05-18",
      supplierName: "Milano Dry Goods",
    },
    {
      name: "Heirloom tomato",
      unit: "lb",
      onHand: 6,
      par: 30,
      lowAt: 10,
      expires: "2026-10-18",
      supplierName: "Green Valley Farms",
    },
    {
      name: "House red wine",
      unit: "btl",
      onHand: 18,
      par: 24,
      lowAt: 6,
      expires: null,
      supplierName: "Bellwood Distributors",
    },
    {
      name: "IPA keg",
      unit: "keg",
      onHand: 1,
      par: 4,
      lowAt: 2,
      expires: "2026-11-20",
      supplierName: "Bellwood Distributors",
    },
    {
      name: "Parmigiano",
      unit: "lb",
      onHand: 9,
      par: 10,
      lowAt: 3,
      expires: "2027-01-08",
      supplierName: "Milano Dry Goods",
    },
    {
      name: "Salmon fillet",
      unit: "pc",
      onHand: 34,
      par: 50,
      lowAt: 15,
      expires: "2026-10-17",
      supplierName: "Coastal Seafood Co.",
    },
    {
      name: "Shishito peppers",
      unit: "lb",
      onHand: 11,
      par: 15,
      lowAt: 4,
      expires: "2026-10-19",
      supplierName: "Green Valley Farms",
    },
  ];

  // 1. Seed Suppliers and map their names to database-generated IDs
  const supplierIdMap = new Map<string, string>();

  for (const supplierData of seedSuppliers) {
    const [existing] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.name, supplierData.name))
      .limit(1);

    let supplierId: string;

    if (!existing) {
      const inserted = await db
        .insert(suppliers)
        .values(supplierData)
        .returning({ id: suppliers.id });
      supplierId = inserted[0].id;
    } else {
      supplierId = existing.id;
    }

    supplierIdMap.set(supplierData.name, supplierId);
  }

  // 2. Seed Inventory Items using the retrieved supplier IDs
  for (const item of seedInventoryItems) {
    const { supplierName, ...itemData } = item;
    const supplierId = supplierIdMap.get(supplierName);

    if (!supplierId) {
      throw new Error(
        `Supplier "${supplierName}" not found for inventory item "${item.name}".`,
      );
    }

    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.name, itemData.name))
      .limit(1);

    const payload = {
      ...itemData,
      supplierId,
    };

    if (!existing) {
      await db.insert(inventoryItems).values(payload);
    } else {
      await db
        .update(inventoryItems)
        .set(payload)
        .where(eq(inventoryItems.id, existing.id));
    }
  }

  console.log("✅ Suppliers and inventory items seeded successfully.");
}
