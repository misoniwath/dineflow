"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getBillsApi, recordBillPaymentApi } from "@/lib/api/bills";
import { getGuestBills, splitBillEvenly } from "@/lib/billing";
import { cn, money } from "@/lib/utils";
import type { Bill, BillItem, RecordBillPaymentInput } from "@/types/Bill";

function BillLines({ items }: { items: BillItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4">
          <span>
            {item.quantity}× {item.name}
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {money.format((item.quantity * item.unitPriceCents) / 100)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BillDetails({
  bill,
  busy,
  onPay,
}: {
  bill: Bill;
  busy: boolean;
  onPay: (input: RecordBillPaymentInput) => Promise<void>;
}) {
  const [splitMode, setSplitMode] = useState<"even" | "guest">("even");
  const [guestCountInput, setGuestCountInput] = useState(
    String(bill.guestCount),
  );
  const [assignments, setAssignments] = useState<Record<string, number | null>>(
    () =>
      Object.fromEntries(bill.items.map((item) => [item.id, item.guestNumber])),
  );
  const isPaid = bill.status === "paid";
  const guestCount = Number(guestCountInput);
  const validGuests =
    Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 100;
  const preview = {
    ...bill,
    guestCount,
    items: bill.items.map((item) => ({
      ...item,
      guestNumber: assignments[item.id] ?? null,
    })),
  };
  let shares: number[] = [];
  let guestBills: ReturnType<typeof getGuestBills> = [];
  let splitError: string | null = null;
  try {
    if (!validGuests)
      throw new RangeError("Enter a guest count between 1 and 100.");
    if (splitMode === "even")
      shares = splitBillEvenly(bill.totalCents, guestCount);
    else guestBills = getGuestBills(preview);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    splitError = error.message;
  }
  const paymentAssignments = Object.fromEntries(
    preview.items.map((item) => [
      item.id,
      item.guestNumber !== null && item.guestNumber <= guestCount
        ? item.guestNumber
        : null,
    ]),
  );

  return (
    <article
      aria-labelledby="selected-bill-title"
      className="min-w-0 space-y-5 rounded-xl border bg-card p-5 text-card-foreground sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <h2 id="selected-bill-title" className="text-lg font-semibold">
            Table {bill.tableNumber}
          </h2>
          <p className="text-sm text-muted-foreground">
            {bill.orderIds.length}{" "}
            {bill.orderIds.length === 1 ? "order" : "orders"} ·{" "}
            {bill.items.reduce((sum, item) => sum + item.quantity, 0)} items
          </p>
          <p className="text-xs text-muted-foreground break-all">
            Orders: {bill.orderIds.map((id) => id.slice(0, 8)).join(", ")}
          </p>
          {isPaid && (
            <p className="text-xs text-muted-foreground">Receipt {bill.id}</p>
          )}
        </div>
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
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-2 text-sm">
          <span className="block">Guests</span>
          <input
            aria-label="Guest count"
            type="number"
            min="1"
            max="100"
            step="1"
            disabled={busy || isPaid}
            value={guestCountInput}
            onChange={(event) => setGuestCountInput(event.target.value)}
            className="h-10 w-24 rounded-lg border bg-background px-3"
          />
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={splitMode === "even" ? "default" : "outline"}
            aria-pressed={splitMode === "even"}
            disabled={busy}
            onClick={() => setSplitMode("even")}
          >
            Evenly
          </Button>
          <Button
            type="button"
            variant={splitMode === "guest" ? "default" : "outline"}
            aria-pressed={splitMode === "guest"}
            disabled={busy}
            onClick={() => setSplitMode("guest")}
          >
            By guest
          </Button>
        </div>
      </div>

      {splitMode === "guest" && validGuests && !isPaid && (
        <fieldset disabled={busy} className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">
            Assign items to guests
          </legend>
          <p className="text-sm text-muted-foreground">
            Each line’s full quantity is assigned to one guest.
          </p>
          {bill.items.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span>
                {item.quantity}× {item.name}
              </span>
              <select
                aria-label={"Guest for " + item.name + " " + item.id}
                value={assignments[item.id] ?? ""}
                onChange={(event) =>
                  setAssignments((current) => ({
                    ...current,
                    [item.id]:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  }))
                }
                className="h-10 rounded-lg border bg-background px-3"
              >
                <option value="">Unassigned</option>
                {Array.from({ length: guestCount }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Guest {index + 1}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      )}
      {splitError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
        >
          {splitError} The full bill is shown below.
        </p>
      )}
      {splitMode === "even" || splitError ? (
        <BillLines items={bill.items} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {guestBills.map((guestBill) => (
            <section
              key={guestBill.guestNumber}
              aria-label={"Guest " + guestBill.guestNumber}
              className="space-y-4"
            >
              <h3 className="font-medium">Guest {guestBill.guestNumber}</h3>
              {guestBill.items.length > 0 ? (
                <BillLines items={guestBill.items} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No items assigned
                </p>
              )}
              <p className="flex justify-between border-t pt-4">
                <span>Subtotal</span>
                <span>{money.format(guestBill.totalCents / 100)}</span>
              </p>
            </section>
          ))}
        </div>
      )}
      <footer className="space-y-4 border-t pt-4">
        <p className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{money.format(bill.totalCents / 100)}</span>
        </p>
        {splitMode === "even" && !splitError && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Split {guestCount} {guestCount === 1 ? "way" : "ways"}
            </p>
            {shares.map((amount, index) => (
              <p key={index} className="flex justify-between">
                <span>Guest {index + 1}</span>
                <span>{money.format(amount / 100)}</span>
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {isPaid
              ? "Full payment recorded."
              : "Mark as paid once the full payment has been received."}
          </p>
          <Button
            type="button"
            disabled={isPaid || busy || !validGuests || bill.items.length === 0}
            onClick={() =>
              void onPay({
                tableNumber: bill.tableNumber,
                orderIds: bill.orderIds,
                expectedTotalCents: bill.totalCents,
                guestCount,
                guestAssignments: paymentAssignments,
              })
            }
          >
            {isPaid ? "Paid" : busy ? "Saving…" : "Mark as paid"}
          </Button>
        </div>
      </footer>
    </article>
  );
}

export default function BillingView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [filter, setFilter] = useState<Bill["status"]>("unpaid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBills(await getBillsApi());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load bills");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadBills(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadBills]);
  const visibleBills = bills.filter((bill) => bill.status === filter);
  const bill =
    visibleBills.find((candidate) => candidate.id === selectedBillId) ??
    visibleBills[0];

  async function markAsPaid(input: RecordBillPaymentInput) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const paid = await recordBillPaymentApi(input);
      setBills((current) => [
        paid,
        ...current.filter(
          (candidate) =>
            candidate.id !== `table-${input.tableNumber}` &&
            candidate.id !== paid.id,
        ),
      ]);
      setSelectedBillId(paid.id);
      setFilter("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="Billing"
      className="min-h-[calc(100dvh-6rem)] space-y-6 rounded-xl bg-background p-4 text-foreground sm:p-6"
    >
      <h1 className="sr-only">Billing</h1>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["unpaid", "paid"] as const).map((status) => (
            <Button
              key={status}
              type="button"
              variant={filter === status ? "default" : "outline"}
              aria-pressed={filter === status}
              disabled={saving}
              onClick={() => setFilter(status)}
            >
              {status === "unpaid" ? "Unpaid bills" : "Paid bills"} (
              {bills.filter((bill) => bill.status === status).length})
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading || saving}
          onClick={() => void loadBills()}
        >
          {loading ? "Loading bills…" : "Refresh bills"}
        </Button>
      </header>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {bill ? (
        <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="Bills" className="flex flex-col gap-2">
            {visibleBills.map((candidate) => (
              <Button
                key={candidate.id}
                type="button"
                variant={candidate.id === bill.id ? "default" : "outline"}
                disabled={saving}
                aria-pressed={candidate.id === bill.id}
                aria-label={
                  "Table " +
                  candidate.tableNumber +
                  (candidate.status === "paid"
                    ? " receipt " + candidate.id
                    : " bill")
                }
                onClick={() => setSelectedBillId(candidate.id)}
                className="h-auto justify-between gap-3 py-3"
              >
                <span>
                  Table {candidate.tableNumber}
                  {candidate.status === "paid" && (
                    <small className="block">
                      Receipt {candidate.id.slice(0, 8)}
                    </small>
                  )}
                </span>
                <span>{money.format(candidate.totalCents / 100)}</span>
              </Button>
            ))}
          </aside>
          <BillDetails
            key={bill.id + ":" + bill.orderIds.join(",")}
            bill={bill}
            busy={saving || loading}
            onPay={markAsPaid}
          />
        </div>
      ) : (
        !loading &&
        !error && (
          <p
            role="status"
            className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
          >
            No {filter} bills available
          </p>
        )
      )}
    </section>
  );
}
