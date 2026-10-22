import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { OrderAccessError, requireOrderStaff } from "@/lib/auth/orders";
import { cancelOrder, OrderCancellationError } from "@/lib/db/order-cancellation";
import { db } from "@/lib/db/index";
import { orders } from "@/lib/db/schema";

const previousStatus = {
  preparing: "pending",
  ready: "preparing",
  completed: "ready",
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireOrderStaff();

    const { id } = await params;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID format" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const status: unknown = body?.status;

    if (status === "cancelled") {
      const order = await cancelOrder(id, actor.id, body?.reason);
      return NextResponse.json({ success: true, order });
    }

    if (status !== "preparing" && status !== "ready" && status !== "completed") {
      return NextResponse.json(
        { success: false, message: "Invalid status value" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ status })
      .where(
        and(eq(orders.id, id), eq(orders.status, previousStatus[status])),
      )
      .returning({ id: orders.id, status: orders.status });

    if (!updated) {
      const [existing] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      return NextResponse.json(
        {
          success: false,
          message: existing
            ? "Order status changed. Refresh and try again."
            : "Order not found",
        },
        { status: existing ? 409 : 404 },
      );
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    if (error instanceof OrderAccessError || error instanceof OrderCancellationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("Failed to update order", error);
    return NextResponse.json(
      { success: false, message: "Failed to update order" },
      { status: 500 },
    );
  }
}
