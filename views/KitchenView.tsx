"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrder } from "@/stores/OrderStore";
import type { KitchenTicket } from "@/types/KitchenTicket";
import CancelOrderDialog from "@/components/kitchen/CancelOrderDialog";

const columns = [
  {
    status: "pending",
    title: "Placed",
    borderClass: "border-l-[#54a0e8]",
    actionLabel: "Start preparing",
    nextStatus: "preparing",
  },
  {
    status: "preparing",
    title: "Preparing",
    borderClass: "border-l-[#e3a83e]",
    actionLabel: "Mark ready",
    nextStatus: "ready",
  },
  {
    status: "ready",
    title: "Ready",
    borderClass: "border-l-[#46c08a]",
    actionLabel: "Mark served",
    nextStatus: "completed",
  },
] as const;

const OVERDUE_SECONDS = 8 * 60;

function elapsedSeconds(createdAt: string, now: number | null) {
  if (now === null) return null;
  return Math.max(0, Math.floor((now - Date.parse(createdAt)) / 1000));
}

function formatElapsedTime(seconds: number | null) {
  if (seconds === null) return "--:--";

  const minutes = Math.floor(seconds / 60);
  return minutes + ":" + String(seconds % 60).padStart(2, "0");
}

export default function KitchenView() {
  const {
    kitchenTickets: tickets,
    updateKitchenStatus,
    cancelKitchenOrder,
    loadData,
    loading,
    error,
  } = useOrder();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingTicket, setCancellingTicket] = useState<KitchenTicket | null>(null);
  const [notice, setNotice] = useState("");
  // A shared clock updates every card without creating a timer per ticket.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadData]);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initialTick = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 1000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, []);

  async function updateTicketStatus(
    ticketId: string,
    nextStatus: KitchenTicket["status"],
  ) {
    if (savingId !== null) return;

    setSavingId(ticketId);
    setActionError(null);
    setNotice("");

    try {
      await updateKitchenStatus(ticketId, nextStatus);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update order",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function confirmCancellation(reason: string) {
    if (!cancellingTicket || savingId !== null) return;
    setSavingId(cancellingTicket.id);
    setActionError(null);
    setNotice("");
    try {
      await cancelKitchenOrder(cancellingTicket.id, reason);
      setNotice(`Order for table ${cancellingTicket.tableNumber} cancelled.`);
      setCancellingTicket(null);
    } finally {
      setSavingId(null);
    }
  }

  const openCount = tickets.length;

  return (
    <section className="min-h-[calc(100dvh-6rem)] space-y-6 rounded-xl bg-background p-4 text-foreground sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <span
          role="status"
          className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground dark:bg-[#212b32] dark:text-[#9eb0ba]"
        >
          {openCount} open
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={loading || savingId !== null}
          onClick={() => {
            setActionError(null);
            void loadData();
          }}
        >
          {loading ? "Loading orders…" : "Refresh orders"}
        </Button>
      </header>

      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}

      {(actionError || error) && (
        <p role="alert" className="text-sm text-destructive">
          {actionError || error}
        </p>
      )}

      {/* Render the status columns first, then the tickets belonging to each. */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        {columns.map((column) => {
          const columnTickets = tickets.filter(
            (ticket) => ticket.status === column.status,
          );

          return (
            <section
              key={column.status}
              aria-labelledby={"column-" + column.status}
              className="min-w-0"
            >
              <h2
                id={"column-" + column.status}
                className="mb-4 flex items-center gap-2 border-b pb-3 text-sm font-medium text-muted-foreground dark:border-[#26323a] dark:text-[#9eb0ba]"
              >
                {column.title}
                <span className="font-normal dark:text-[#687b87]">
                  {columnTickets.length}
                </span>
              </h2>

              <div className="space-y-4">
                {columnTickets.map((ticket) => {
                  const seconds = elapsedSeconds(ticket.createdAt, now);
                  const isOverdue =
                    ticket.status !== "ready" &&
                    seconds !== null &&
                    seconds >= OVERDUE_SECONDS;

                  return (
                    <article
                      key={ticket.id}
                      aria-labelledby={"kitchen-" + ticket.id}
                      className={cn(
                        "w-full space-y-5 rounded-lg border border-l-4 bg-card p-5 text-card-foreground dark:border-[#26323a] dark:bg-[#141b1f] dark:text-[#e9f0f3]",
                        // Keep the status edge after the dark border color.
                        column.borderClass,
                        column.status === "pending" &&
                          "dark:border-l-[#54a0e8]",
                        column.status === "preparing" &&
                          "dark:border-l-[#e3a83e]",
                        column.status === "ready" && "dark:border-l-[#46c08a]",
                      )}
                    >
                      <header className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h3
                            id={"kitchen-" + ticket.id}
                            className="text-xl font-semibold"
                          >
                            Table {ticket.tableNumber}
                          </h3>
                          {ticket.station && (
                            <p className="text-sm text-muted-foreground dark:text-[#687b87]">
                              {ticket.station}
                            </p>
                          )}
                        </div>

                        <span
                          role="timer"
                          aria-label={
                            "Elapsed time for table " + ticket.tableNumber
                          }
                          className={cn(
                            "shrink-0 font-mono text-3xl leading-none font-semibold tracking-tighter tabular-nums",
                            isOverdue
                              ? "text-[#c2452e] dark:text-[#f2604a]"
                              : "text-muted-foreground dark:text-[#9eb0ba]",
                          )}
                        >
                          {formatElapsedTime(seconds)}
                        </span>
                      </header>

                      <ul className="space-y-1.5 text-base leading-relaxed">
                        {ticket.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}× {item.name}
                          </li>
                        ))}
                      </ul>

                      {ticket.notes && (
                        <p className="text-sm text-muted-foreground dark:text-[#9eb0ba]">
                          Notes: {ticket.notes}
                        </p>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading || savingId !== null}
                        aria-label={
                          column.actionLabel +
                          " for table " +
                          ticket.tableNumber
                        }
                        onClick={() =>
                          updateTicketStatus(ticket.id, column.nextStatus)
                        }
                        className="h-11 w-full text-base font-normal text-muted-foreground dark:border-[#26323a] dark:bg-[#1a2228] dark:text-[#9eb0ba] dark:hover:bg-[#212b32]"
                      >
                        {savingId === ticket.id
                          ? "Saving…"
                          : column.actionLabel}
                      </Button>
                      {ticket.status === "pending" && (
                        <div className="space-y-2">
                          <Button
                            type="button" variant="destructive" className="w-full"
                            disabled={loading || savingId !== null || !ticket.canCancel}
                            aria-label={`Cancel order for table ${ticket.tableNumber}`}
                            onClick={() => setCancellingTicket(ticket)}
                          >
                            Cancel order
                          </Button>
                          {!ticket.canCancel && ticket.cancellationBlockReason && (
                            <p className="text-xs text-muted-foreground">{ticket.cancellationBlockReason}</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}

                {columnTickets.length === 0 && !loading && !error && (
                  <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground dark:border-[#26323a] dark:text-[#687b87]">
                    No {column.title.toLowerCase()} tickets
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {cancellingTicket && (
        <CancelOrderDialog
          key={cancellingTicket.id}
          ticket={cancellingTicket}
          onClose={() => setCancellingTicket(null)}
          onConfirm={confirmCancellation}
        />
      )}
    </section>
  );
}
