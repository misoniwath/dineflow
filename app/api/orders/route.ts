import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import {
  orders,
  orderItems,
  menuItems,
  menuInventoryItems,
  inventoryItems,
  billPaymentOrders,
} from "@/lib/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCancellationBlockReason } from "@/lib/db/order-cancellation";
import type { OrderInventoryDeduction } from "@/types/Order";

export async function GET() {
  try {
    // 1. Fetch all menu items grouped or as a flat list
    const allMenuItems = await db.select().from(menuItems);

    // 2. Fetch all active orders with their associated items
    const allOrders = await db
      .select({ order: orders, paidOrderId: billPaymentOrders.orderId })
      .from(orders)
      .leftJoin(billPaymentOrders, eq(billPaymentOrders.orderId, orders.id))
      .orderBy(desc(orders.createdAt));
    const ordersWithItems = await Promise.all(
      allOrders.map(async ({ order, paidOrderId }) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        const cancellationBlockReason = getCancellationBlockReason(order, paidOrderId !== null);
        return {
          ...order, items,
          canCancel: cancellationBlockReason === null,
          cancellationBlockReason,
        };
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

class InvalidOrderError extends Error {}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const tableNumber = Number(body?.tableNumber);
    if (
      !Number.isInteger(tableNumber) ||
      tableNumber < 1 ||
      tableNumber > 2147483647 ||
      !Array.isArray(body?.items) ||
      body.items.length === 0
    ) {
      throw new InvalidOrderError(
        "A valid table number and items are required",
      );
    }
    const items: { menuItemId: string; quantity: number }[] = body.items.map(
      (item: unknown) => {
        if (
          !item ||
          typeof item !== "object" ||
          !("menuItemId" in item) ||
          !("quantity" in item) ||
          typeof item.menuItemId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            item.menuItemId,
          ) ||
          typeof item.quantity !== "number" ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 2147483647
        ) {
          throw new InvalidOrderError(
            "Each order item needs a valid menu ID and positive quantity",
          );
        }
        return { menuItemId: item.menuItemId, quantity: item.quantity };
      },
    );
    const menuIds = [...new Set(items.map((item) => item.menuItemId))];
    const newOrder = await db.transaction(async (tx) => {
      const catalog = await tx
        .select({ id: menuItems.id, price: menuItems.price })
        .from(menuItems)
        .where(inArray(menuItems.id, menuIds));
      const prices = new Map(catalog.map((item) => [item.id, item.price]));
      if (menuIds.some((id) => !prices.has(id))) {
        throw new InvalidOrderError(
          "One or more menu items are no longer available",
        );
      }
      const [order] = await tx
        .insert(orders)
        .values({ tableNumber, status: "pending", inventoryDeductions: [] })
        .returning();
      // Snapshot server prices and publish the complete order only when every write succeeds.
      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: prices.get(item.menuItemId)!,
        })),
      );
      const quantities = new Map<string, number>();
      for (const item of items) {
        quantities.set(
          item.menuItemId,
          (quantities.get(item.menuItemId) ?? 0) + item.quantity,
        );
      }
      const recipes = await tx
        .select()
        .from(menuInventoryItems)
        .where(inArray(menuInventoryItems.menuItemId, menuIds));
      const deductions = new Map<string, number>();
      for (const recipe of recipes) {
        if (!Number.isFinite(recipe.quantityRequired) || recipe.quantityRequired < 0) {
          throw new InvalidOrderError("A menu item's ingredient quantities need review.");
        }
        deductions.set(
          recipe.inventoryItemId,
          (deductions.get(recipe.inventoryItemId) ?? 0) +
            recipe.quantityRequired * quantities.get(recipe.menuItemId)!,
        );
      }
      const inventoryDeductions: OrderInventoryDeduction[] = [];
      for (const [id, quantity] of [...deductions].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        if (quantity === 0) continue;
        const [before] = await tx.select({ onHand: inventoryItems.onHand })
          .from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1).for("update");
        if (!before || !Number.isFinite(before.onHand) || before.onHand < 0) {
          throw new InvalidOrderError("An ingredient's stock level needs review.");
        }
        const [after] = await tx
          .update(inventoryItems)
          .set({
            onHand: sql`GREATEST(0, ${inventoryItems.onHand} - ${quantity})`,
          })
          .where(eq(inventoryItems.id, id))
          .returning({ onHand: inventoryItems.onHand });
        const actualDeduction = before.onHand - after.onHand;
        if (actualDeduction > 0) {
          inventoryDeductions.push({ inventoryItemId: id, quantity: actualDeduction });
        }
      }
      const [saved] = await tx.update(orders).set({ inventoryDeductions })
        .where(eq(orders.id, order.id)).returning();
      return saved;
    });
    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    if (error instanceof InvalidOrderError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }
    console.error("Failed to create order", error);
    return NextResponse.json(
      { success: false, message: "Failed to create order" },
      { status: 500 },
    );
  }
}
