import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { combineUnpaidOrders, getBillTotalCents } from "@/lib/billing";
import { db } from "@/lib/db/index";
import {
  billPaymentOrders,
  billPayments,
  floorTables,
  menuItems,
  orderItems,
  orders,
} from "@/lib/db/schema";
import type { Bill, BillItem, RecordBillPaymentInput } from "@/types/Bill";

export class BillingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePaymentInput(body: unknown): RecordBillPaymentInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BillingError("Invalid payment request", 400);
  }
  const input = body as Record<string, unknown>;
  const {
    tableNumber,
    expectedTotalCents,
    guestCount,
    orderIds,
    guestAssignments,
  } = input;
  if (
    typeof tableNumber !== "number" ||
    !Number.isInteger(tableNumber) ||
    tableNumber < 1 ||
    tableNumber > 2147483647 ||
    typeof expectedTotalCents !== "number" ||
    !Number.isInteger(expectedTotalCents) ||
    expectedTotalCents < 0 ||
    expectedTotalCents > 2147483647 ||
    typeof guestCount !== "number" ||
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 100 ||
    !Array.isArray(orderIds) ||
    orderIds.length === 0 ||
    orderIds.some((id) => typeof id !== "string" || !uuidPattern.test(id)) ||
    new Set(orderIds).size !== orderIds.length ||
    !guestAssignments ||
    typeof guestAssignments !== "object" ||
    Array.isArray(guestAssignments)
  ) {
    throw new BillingError("Invalid table, orders, total, or guest count", 400);
  }
  const assignments: Record<string, number | null> = {};
  for (const [id, guest] of Object.entries(guestAssignments)) {
    if (
      !uuidPattern.test(id) ||
      (guest !== null &&
        (typeof guest !== "number" ||
          !Number.isInteger(guest) ||
          guest < 1 ||
          guest > guestCount))
    ) {
      throw new BillingError("Invalid guest assignment", 400);
    }
    assignments[id] = guest;
  }
  return {
    tableNumber,
    expectedTotalCents,
    guestCount,
    orderIds,
    guestAssignments: assignments,
  };
}

export async function listBills(): Promise<Bill[]> {
  return db.transaction(
    async (tx) => {
      const lines = await tx
        .select({
          orderId: orders.id,
          tableNumber: orders.tableNumber,
          createdAt: orders.createdAt,
          id: orderItems.id,
          name: menuItems.name,
          quantity: orderItems.quantity,
          unitPriceCents: orderItems.price,
        })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .leftJoin(menuItems, eq(menuItems.id, orderItems.menuItemId))
        .leftJoin(billPaymentOrders, eq(billPaymentOrders.orderId, orders.id))
        .where(
          and(
            ne(orders.status, "cancelled"),
            isNull(billPaymentOrders.orderId),
          ),
        )
        .orderBy(asc(orders.createdAt), asc(orderItems.id));

      const byOrder = new Map<
        string,
        {
          id: string;
          tableNumber: number;
          createdAt: string;
          items: BillItem[];
        }
      >();
      for (const line of lines) {
        let order = byOrder.get(line.orderId);
        if (!order) {
          order = {
            id: line.orderId,
            tableNumber: line.tableNumber,
            createdAt: line.createdAt.toISOString(),
            items: [],
          };
          byOrder.set(line.orderId, order);
        }
        order.items.push({
          id: line.id,
          name: line.name ?? "Unknown menu item",
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          guestNumber: null,
        });
      }
      const tables = await tx
        .select({ number: floorTables.number, guests: floorTables.guests })
        .from(floorTables);
      const openBills = combineUnpaidOrders(
        [...byOrder.values()],
        new Map(tables.map((table) => [table.number, table.guests])),
      );

      const paidRows = await tx
        .select({ payment: billPayments, orderId: billPaymentOrders.orderId })
        .from(billPayments)
        .innerJoin(
          billPaymentOrders,
          eq(billPaymentOrders.paymentId, billPayments.id),
        )
        .orderBy(desc(billPayments.paidAt));
      const paidBills = new Map<string, Bill>();
      for (const { payment, orderId } of paidRows) {
        let bill = paidBills.get(payment.id);
        if (!bill) {
          bill = {
            id: payment.id,
            orderIds: [],
            tableNumber: payment.tableNumber,
            guestCount: payment.guestCount,
            totalCents: payment.totalCents,
            items: payment.items,
            status: "paid",
            createdAt: payment.paidAt.toISOString(),
            paidAt: payment.paidAt.toISOString(),
          };
          paidBills.set(payment.id, bill);
        }
        bill.orderIds.push(orderId);
      }
      return [...openBills, ...paidBills.values()];
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function recordBillPayment(
  input: RecordBillPaymentInput,
): Promise<Bill> {
  return db.transaction(async (tx) => {
    // Serialize payments for these orders before checking which remain unpaid.
    const tableOrders = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tableNumber, input.tableNumber),
          ne(orders.status, "cancelled"),
        ),
      )
      .orderBy(asc(orders.id))
      .for("update");
    const ids = tableOrders.map((order) => order.id);
    const paidOrders =
      ids.length > 0
        ? await tx
            .select({ orderId: billPaymentOrders.orderId })
            .from(billPaymentOrders)
            .where(inArray(billPaymentOrders.orderId, ids))
        : [];
    const alreadyPaid = new Set(paidOrders.map((order) => order.orderId));
    const unpaid = tableOrders.filter((order) => !alreadyPaid.has(order.id));
    const requested = new Set(input.orderIds);
    if (
      unpaid.length !== requested.size ||
      unpaid.some((order) => !requested.has(order.id))
    ) {
      throw new BillingError(
        "This table's orders changed. Refresh the bill and try again.",
        409,
      );
    }

    const lines = await tx
      .select({
        id: orderItems.id,
        name: menuItems.name,
        orderId: orderItems.orderId,
        quantity: orderItems.quantity,
        unitPriceCents: orderItems.price,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(menuItems.id, orderItems.menuItemId))
      .where(inArray(orderItems.orderId, input.orderIds))
      .orderBy(asc(orderItems.id));
    if (new Set(lines.map((line) => line.orderId)).size !== unpaid.length) {
      throw new BillingError(
        "An order has no items. Refresh the bill and try again.",
        409,
      );
    }
    const itemIds = new Set(lines.map((line) => line.id));
    if (Object.keys(input.guestAssignments).some((id) => !itemIds.has(id))) {
      throw new BillingError("Guest assignments do not match this bill", 400);
    }
    const items: BillItem[] = lines.map((line) => ({
      id: line.id,
      name: line.name ?? "Unknown menu item",
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      guestNumber: input.guestAssignments[line.id] ?? null,
    }));
    const totalCents = getBillTotalCents(items);
    if (totalCents !== input.expectedTotalCents) {
      throw new BillingError(
        "The bill total changed. Refresh the bill and try again.",
        409,
      );
    }
    const [payment] = await tx
      .insert(billPayments)
      .values({
        tableNumber: input.tableNumber,
        totalCents,
        guestCount: input.guestCount,
        items,
      })
      .returning();
    await tx.insert(billPaymentOrders).values(
      input.orderIds.map((orderId) => ({
        orderId,
        paymentId: payment.id,
      })),
    );

    return {
      id: payment.id,
      orderIds: input.orderIds,
      tableNumber: payment.tableNumber,
      guestCount: payment.guestCount,
      items: payment.items,
      totalCents: payment.totalCents,
      status: "paid",
      createdAt: payment.paidAt.toISOString(),
      paidAt: payment.paidAt.toISOString(),
    };
  });
}
