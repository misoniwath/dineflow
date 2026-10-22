import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { billPaymentOrders, inventoryItems, orders } from "@/lib/db/schema";

export class OrderCancellationError extends Error {
  constructor(message: string, public status: 400 | 404 | 409) {
    super(message);
    this.name = "OrderCancellationError";
  }
}

export function getCancellationBlockReason(
  order: Pick<typeof orders.$inferSelect, "status" | "inventoryDeductions">,
  isPaid: boolean,
) {
  if (isPaid) return "Paid orders require a payment reversal.";
  if (order.status !== "pending") return "Only placed orders can be cancelled. Refresh Kitchen.";
  if (!Array.isArray(order.inventoryDeductions)) {
    return "This older order needs a stock review before it can be cancelled.";
  }
  return null;
}

export async function cancelOrder(id: string, cancelledBy: string, reason: unknown) {
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    throw new OrderCancellationError("Enter a cancellation reason of 1–500 characters.", 400);
  }
  const cancelReason = reason.trim();
  return db.transaction(async (tx) => {
    // Billing locks these same rows before recording payment; only one action can win.
    const [order] = await tx.select().from(orders)
      .where(eq(orders.id, id)).limit(1).for("update");
    if (!order) throw new OrderCancellationError("Order not found", 404);
    if (order.status === "cancelled") {
      return { id: order.id, status: order.status, canCancel: false };
    }
    const [payment] = await tx.select({ id: billPaymentOrders.paymentId })
      .from(billPaymentOrders).where(eq(billPaymentOrders.orderId, id)).limit(1);
    const blocker = getCancellationBlockReason(order, Boolean(payment));
    if (blocker) throw new OrderCancellationError(blocker, 409);

    const deductions = [...order.inventoryDeductions!].sort((a, b) =>
      a.inventoryItemId.localeCompare(b.inventoryItemId),
    );
    const ids = deductions.map((deduction) => deduction.inventoryItemId);
    if (
      new Set(ids).size !== ids.length ||
      deductions.some((deduction) => !Number.isFinite(deduction.quantity) || deduction.quantity <= 0)
    ) {
      throw new OrderCancellationError("This order's stock records need review before cancellation.", 409);
    }
    if (ids.length) {
      const stock = await tx.select({ id: inventoryItems.id }).from(inventoryItems)
        .where(inArray(inventoryItems.id, ids)).orderBy(asc(inventoryItems.id)).for("update");
      if (stock.length !== ids.length) {
        throw new OrderCancellationError("An ingredient was removed. Review stock before cancelling this order.", 409);
      }
      for (const deduction of deductions) {
        await tx.update(inventoryItems)
          .set({ onHand: sql`${inventoryItems.onHand} + ${deduction.quantity}` })
          .where(eq(inventoryItems.id, deduction.inventoryItemId));
      }
    }
    const [updated] = await tx.update(orders)
      .set({ status: "cancelled", cancelledBy, cancelReason, cancelledAt: sql`clock_timestamp()` })
      .where(eq(orders.id, id))
      .returning({ id: orders.id, status: orders.status });
    return { ...updated, canCancel: false };
  });
}
