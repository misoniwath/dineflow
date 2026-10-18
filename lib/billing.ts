import type { Bill, BillItem } from "@/types/Bill";

export function getBillTotalCents(items: BillItem[]) {
  return items.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  );
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
