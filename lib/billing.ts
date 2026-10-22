import type { Bill, BillItem } from "@/types/Bill";

export function getBillTotalCents(items: BillItem[]) {
  return items.reduce((total, item) => {
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      !Number.isSafeInteger(item.unitPriceCents) ||
      item.unitPriceCents < 0
    ) {
      throw new RangeError(
        "Bill quantities and prices must be valid integers.",
      );
    }
    const nextTotal = total + item.quantity * item.unitPriceCents;
    if (!Number.isSafeInteger(nextTotal)) {
      throw new RangeError("The bill total is too large.");
    }
    return nextTotal;
  }, 0);
}

export function combineUnpaidOrders(
  orders: {
    id: string;
    tableNumber: number;
    createdAt: string;
    items: BillItem[];
  }[],
  guestCounts: Map<number, number> = new Map(),
): Bill[] {
  const bills = new Map<number, Bill>();
  for (const order of orders) {
    let bill = bills.get(order.tableNumber);
    if (!bill) {
      const guests = guestCounts.get(order.tableNumber) ?? 1;
      bill = {
        id: `table-${order.tableNumber}`,
        orderIds: [],
        tableNumber: order.tableNumber,
        guestCount: Number.isSafeInteger(guests) && guests > 0 ? guests : 1,
        status: "unpaid",
        totalCents: 0,
        createdAt: order.createdAt,
        paidAt: null,
        items: [],
      };
      bills.set(order.tableNumber, bill);
    }
    bill.orderIds.push(order.id);
    bill.items.push(...order.items);
    if (order.createdAt < bill.createdAt) bill.createdAt = order.createdAt;
  }
  return [...bills.values()]
    .map((bill) => ({ ...bill, totalCents: getBillTotalCents(bill.items) }))
    .sort((a, b) => a.tableNumber - b.tableNumber);
}

export function splitBillEvenly(totalCents: number, guestCount: number) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new RangeError("The total must be a non-negative integer in cents.");
  }
  if (!Number.isSafeInteger(guestCount) || guestCount < 1) {
    throw new RangeError("The guest count must be a positive integer.");
  }

  const baseShare = Math.floor(totalCents / guestCount);
  const remainingCents = totalCents % guestCount;

  // Allocate leftover cents so the shares always add up to the full bill.
  return Array.from(
    { length: guestCount },
    (_, index) => baseShare + (index < remainingCents ? 1 : 0),
  );
}

export function getGuestBills(bill: Bill) {
  if (!Number.isSafeInteger(bill.guestCount) || bill.guestCount < 1) {
    throw new RangeError("The guest count must be a positive integer.");
  }

  for (const item of bill.items) {
    if (
      typeof item.guestNumber !== "number" ||
      !Number.isSafeInteger(item.guestNumber) ||
      item.guestNumber < 1 ||
      item.guestNumber > bill.guestCount
    ) {
      throw new RangeError(
        `Assign "${item.name}" to a guest between 1 and ${bill.guestCount} before splitting the bill.`,
      );
    }
  }

  return Array.from({ length: bill.guestCount }, (_, index) => {
    const guestNumber = index + 1;
    const items = bill.items.filter((item) => item.guestNumber === guestNumber);

    return { guestNumber, items, totalCents: getBillTotalCents(items) };
  });
}
