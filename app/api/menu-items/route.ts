import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { menuItems, menuInventoryItems } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Fetch all menu items
    const allMenuItems = await db.select().from(menuItems);

    // 2. Attach associated ingredients from the junction table for each item
    const menuWithIngredients = await Promise.all(
      allMenuItems.map(async (menuItem) => {
        const ingredients = await db
          .select()
          .from(menuInventoryItems)
          .where(eq(menuInventoryItems.menuItemId, menuItem.id));

        return {
          ...menuItem,
          ingredients, // Matches the updated MenuItem type definition
        };
      }),
    );

    return NextResponse.json({ success: true, items: menuWithIngredients });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, price, image, desc, category, ingredients } = body;

    const itemId = id || `m-${Date.now()}`;
    const imageUrl = image && image.trim() !== "" ? image : null;

    const resultItem = await db.transaction(async (tx) => {
      // 1. Insert or update the menu item
      const [item] = await tx
        .insert(menuItems)
        .values({
          id: itemId,
          name,
          price: price,
          image: imageUrl,
          desc: desc || null,
          category,
        })
        .onConflictDoUpdate({
          target: menuItems.id,
          set: {
            name,
            price: price,
            image: imageUrl,
            desc: desc || null,
            category,
            updatedAt: sql`NOW()`,
          },
        })
        .returning();

      // 2. Clear old recipe ingredient mappings for this menu item
      await tx
        .delete(menuInventoryItems)
        .where(eq(menuInventoryItems.menuItemId, itemId));

      // 3. Insert new recipe ingredients if provided
      if (Array.isArray(ingredients) && ingredients.length > 0) {
        await tx.insert(menuInventoryItems).values(
          ingredients.map(
            (ing: { inventoryItemId: string; quantityRequired: number }) => ({
              menuItemId: itemId,
              inventoryItemId: ing.inventoryItemId,
              quantityRequired: Number(ing.quantityRequired) || 0,
            }),
          ),
        );
      }

      return item;
    });

    // Fetch the fully populated menu item with its new ingredients to return to client
    const savedIngredients = await db
      .select()
      .from(menuInventoryItems)
      .where(eq(menuInventoryItems.menuItemId, itemId));

    return NextResponse.json({
      success: true,
      item: { ...resultItem, ingredients: savedIngredients },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to save menu item",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Menu item ID is required" },
        { status: 400 },
      );
    }

    await db.delete(menuItems).where(eq(menuItems.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete menu item",
      },
      { status: 500 },
    );
  }
}
