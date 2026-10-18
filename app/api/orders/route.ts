import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import {
  orders,
  orderItems,
  menuItems,
  menuInventoryItems,
  inventoryItems,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Fetch all menu items grouped or as a flat list
    const allMenuItems = await db.select().from(menuItems);

    // 2. Fetch all active orders with their associated items
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
    const ordersWithItems = await Promise.all(
      allOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      }),
    );

    return NextResponse.json({
      success: true,
      menu: allMenuItems,
      orders: ordersWithItems,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableNumber, items } = body;

    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Table number and items are required" },
        { status: 400 },
      );
    }

    // 1. Insert parent order
    const [newOrder] = await db
      .insert(orders)
      .values({
        tableNumber: Number(tableNumber),
        status: "pending",
      })
      .returning();

    // 2. Insert associated order items & calculate stock deductions
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      });

      // Find recipe requirements for this menu item
      const recipeIngredients = await db
        .select()
        .from(menuInventoryItems)
        .where(eq(menuInventoryItems.menuItemId, item.menuItemId));

      // Deduct inventory accordingly
      for (const recipe of recipeIngredients) {
        const totalDeduction = recipe.quantityRequired * item.quantity;

        // Fetch current onHand value and decrement
        const [invItem] = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, recipe.inventoryItemId))
          .limit(1);

        if (invItem) {
          const newOnHand = Math.max(0, invItem.onHand - totalDeduction);
          await db
            .update(inventoryItems)
            .set({ onHand: newOnHand })
            .where(eq(inventoryItems.id, recipe.inventoryItemId));
        }
      }
    }

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create order",
      },
      { status: 500 },
    );
  }
}
