"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getBillTotalCents,
  getGuestBills,
  splitBillEvenly,
} from "@/lib/billing";
import { cn, money } from "@/lib/utils";
import type { Bill, BillItem } from "@/types/Bill";

const sampleBills: Bill[] = [
  {
    id: "bill-4",
    orderId: "order-104",
    tableNumber: 4,
    guestCount: 2,
    status: "unpaid",
    items: [
      {
        id: "line-4-1",
        name: "Grilled salmon",
        quantity: 1,
        unitPriceCents: 2400,
        guestNumber: 1,
      },
      {
        id: "line-4-2",
        name: "Grilled salmon",
        quantity: 1,
        unitPriceCents: 2400,
        guestNumber: 2,
      },
      {
        id: "line-4-3",
        name: "Wild mushroom risotto",
        quantity: 1,
        unitPriceCents: 1900,
        guestNumber: 2,
      },
      {
        id: "line-4-4",
        name: "House red, glass",
        quantity: 1,
        unitPriceCents: 1000,
        guestNumber: 1,
      },
    ],
  },
  {
    id: "bill-9",
    orderId: "order-109",
    tableNumber: 9,
    guestCount: 2,
    status: "paid",
    items: [
      {
        id: "line-9-1",
        name: "Braised short rib",
        quantity: 1,
        unitPriceCents: 2800,
        guestNumber: 1,
      },
      {
        id: "line-9-2",
        name: "Burrata & heirloom tomato",
        quantity: 1,
        unitPriceCents: 1200,
        guestNumber: 2,
      },
      {
        id: "line-9-3",
        name: "IPA draft",
        quantity: 1,
        unitPriceCents: 700,
        guestNumber: 1,
      },
      {
        id: "line-9-4",
        name: "IPA draft",
        quantity: 1,
        unitPriceCents: 700,
        guestNumber: 2,
      },
    ],
  },
  {
    id: "bill-12",
    orderId: "order-112",
    tableNumber: 12,
    guestCount: 2,
    status: "unpaid",
    items: [
      {
        id: "line-12-1",
        name: "Braised short rib",
        quantity: 1,
        unitPriceCents: 2800,
        guestNumber: 1,
      },
      {
        id: "line-12-2",
        name: "House red, glass",
        quantity: 1,
        unitPriceCents: 1000,
        guestNumber: 1,
      },
      {
        id: "line-12-3",
        name: "Affogato",
        quantity: 1,
        unitPriceCents: 650,
        guestNumber: 1,
      },
      {
        id: "line-12-4",
        name: "Grilled salmon",
        quantity: 1,
        unitPriceCents: 2400,
        guestNumber: 2,
      },
      {
        id: "line-12-5",
        name: "Burrata & heirloom tomato",
        quantity: 1,
        unitPriceCents: 1200,
        guestNumber: 2,
      },
      {
        id: "line-12-6",
        name: "Sparkling water",
        quantity: 1,
        unitPriceCents: 400,
        guestNumber: 2,
      },
    ],
  },
];

const splitOptions = [
  { value: "even", label: "Evenly" },
  { value: "guest", label: "By guest" },
] as const;

type SplitMode = (typeof splitOptions)[number]["value"];

function BillLines({ items }: { items: BillItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            {item.quantity > 1 && <span>{item.quantity}× </span>}
            {item.name}
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums dark:text-[#9eb0ba]">
            {money.format((item.quantity * item.unitPriceCents) / 100)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function BillingView() {
  const [bills, setBills] = useState<Bill[]>(sampleBills);
  const [selectedBillId, setSelectedBillId] = useState(sampleBills[0]?.id ?? "");
  const [splitMode, setSplitMode] = useState<SplitMode>("even");

  const bill =
    bills.find((candidate) => candidate.id === selectedBillId) ?? bills[0];

  if (!bill) {
    return (
      <section
        aria-label="Billing"
        className="min-h-[calc(100dvh-6rem)] rounded-xl bg-background p-4 text-foreground sm:p-6"
      >
        <h1 className="sr-only">Billing</h1>
        <p
          role="status"
          className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground dark:border-[#26323a] dark:text-[#9eb0ba]"
        >
          No bills available
        </p>
      </section>
    );
  }

  const isPaid = bill.status === "paid";
  const totalCents = getBillTotalCents(bill.items);
  const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0);
  let evenShares: number[] = [];
  let guestBills: ReturnType<typeof getGuestBills> = [];
  let splitError: string | null = null;

  try {
    if (splitMode === "even") {
      evenShares = splitBillEvenly(totalCents, bill.guestCount);
    } else {
      guestBills = getGuestBills(bill);
    }
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    splitError = error.message;
  }

  const equalShares =
    evenShares.length > 0 &&
    evenShares.every((amount) => amount === evenShares[0]);

  function markAsPaid() {
    setBills((current) =>
      current.map((candidate) =>
        candidate.id === bill.id && candidate.status === "unpaid"
          ? { ...candidate, status: "paid" }
          : candidate,
      ),
    );
  }

  return (
    <section
      aria-label="Billing"
      className="min-h-[calc(100dvh-6rem)] rounded-xl bg-background p-4 text-foreground sm:p-6 "
    >
      <h1 className="sr-only">Billing</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm text-muted-foreground dark:text-[#9eb0ba]">
              Table
            </legend>
            <div className="flex flex-wrap gap-2">
              {bills.map((candidate) => {
                const isSelected = candidate.id === bill.id;

                return (
                  <Button
                    key={candidate.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    aria-label={"Table " + candidate.tableNumber}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedBillId(candidate.id)}
                    className={cn(
                      "h-9 min-w-10 rounded-lg px-3 text-base",
                      isSelected
                        ? "dark:bg-[#e9f0f3] dark:text-[#0b1013] dark:hover:bg-white"
                        : "text-muted-foreground dark:border-[#26323a] dark:bg-[#1a2228] dark:text-[#9eb0ba] dark:hover:bg-[#212b32]",
                    )}
                  >
                    {candidate.tableNumber}
                  </Button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm text-muted-foreground dark:text-[#9eb0ba]">
              Split
            </legend>
            <div className="space-y-2">
              {splitOptions.map((option) => {
                const isSelected = splitMode === option.value;

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    aria-pressed={isSelected}
                    onClick={() => setSplitMode(option.value)}
                    className={cn(
                      "h-10 w-full justify-start rounded-lg px-4 text-base font-normal dark:bg-[#1a2228] dark:hover:bg-[#212b32]",
                      isSelected
                        ? "border-ring text-foreground dark:border-[#687b87] dark:text-[#e9f0f3]"
                        : "text-muted-foreground dark:border-[#26323a] dark:text-[#9eb0ba]",
                    )}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </fieldset>
        </aside>

        <article
          aria-labelledby="selected-bill-title"
          className="min-w-0 space-y-5 rounded-xl border bg-card p-5 text-card-foreground sm:p-6 dark:border-[#26323a] dark:bg-[#141b1f] dark:text-[#e9f0f3]"
        >
          <header className="flex items-center justify-between gap-4 border-b pb-4 dark:border-[#26323a]">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 id="selected-bill-title" className="text-lg font-semibold">
                Table {bill.tableNumber}
              </h2>
              <span
                role="status"
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium",
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-400",
                )}
              >
                {isPaid ? "Paid" : "Unpaid"}
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground dark:bg-[#212b32] dark:text-[#9eb0ba]">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </header>

          {splitError && (
            <p
              role="alert"
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
            >
              {splitError} The full bill is shown below.
            </p>
          )}

          {splitMode === "even" || splitError !== null ? (
            <BillLines items={bill.items} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {guestBills.map((guestBill) => (
                <section
                  key={guestBill.guestNumber}
                  aria-labelledby={"guest-" + guestBill.guestNumber}
                  className="min-w-0 space-y-4"
                >
                  <h3
                    id={"guest-" + guestBill.guestNumber}
                    className="font-medium"
                  >
                    Guest {guestBill.guestNumber}
                  </h3>
                  {guestBill.items.length > 0 ? (
                    <BillLines items={guestBill.items} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No items assigned
                    </p>
                  )}
                  <div className="flex justify-between gap-4 border-t pt-4 font-medium dark:border-[#26323a]">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                      {money.format(guestBill.totalCents / 100)}
                    </span>
                  </div>
                </section>
              ))}
            </div>
          )}

          <footer className="space-y-4 border-t pt-4 dark:border-[#26323a]">
            <div className="flex justify-between gap-4 text-lg font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                {money.format(totalCents / 100)}
              </span>
            </div>

            {splitMode === "even" && splitError === null && (
              <div className="space-y-3">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
                  <span>
                    Split {bill.guestCount}{" "}
                    {bill.guestCount === 1 ? "way" : "ways"}
                  </span>
                  {equalShares && (
                    <span className="text-muted-foreground tabular-nums dark:text-[#9eb0ba]">
                      {money.format(evenShares[0] / 100)} each
                    </span>
                  )}
                </div>

                {!equalShares && (
                  <ul className="space-y-2 text-sm text-muted-foreground dark:text-[#9eb0ba]">
                    {evenShares.map((amount, index) => (
                      <li key={index} className="flex justify-between gap-4">
                        <span>Guest {index + 1}</span>
                        <span className="tabular-nums">
                          {money.format(amount / 100)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#26323a]">
              <p className="text-sm text-muted-foreground dark:text-[#9eb0ba]">
                {isPaid
                  ? "Full payment recorded."
                  : "Mark as paid once the full payment has been received."}
              </p>
              <Button
                type="button"
                disabled={isPaid}
                onClick={markAsPaid}
                className="h-10 w-full sm:w-auto"
              >
                {isPaid ? "Paid" : "Mark as paid"}
              </Button>
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
}
