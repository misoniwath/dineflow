"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenTicket } from "@/types/KitchenTicket";

// Demo timestamps are relative to module load. API tickets will supply these.
const sampleTime = Date.now();

function placedAgo(minutes: number, seconds = 0) {
  return new Date(sampleTime - (minutes * 60 + seconds) * 1000).toISOString();
}

const sampleTickets: KitchenTicket[] = [
  {
    id: "ticket-1",
    tableNumber: 5,
    station: "Pizza / Salad",
    createdAt: placedAgo(49, 39),
    status: "pending",
    items: [
      { id: "item-1", name: "Margherita Pizza", quantity: 2 },
      { id: "item-2", name: "Caesar Salad", quantity: 1 },
    ],
    notes: "Please make one pizza gluten-free.",
  },
  {
    id: "ticket-2",
    tableNumber: 2,
    station: "Grill",
    createdAt: placedAgo(50, 4),
    status: "preparing",
    items: [
      { id: "item-3", name: "Grilled Salmon", quantity: 2 },
      { id: "item-4", name: "Roasted Vegetables", quantity: 1 },
    ],
    notes: "Serve the sauce on the side.",
  },
  {
    id: "ticket-3",
    tableNumber: 8,
    station: "Grill",
    createdAt: placedAgo(50, 34),
    status: "ready",
    items: [
      { id: "item-5", name: "Cheeseburger", quantity: 1 },
      { id: "item-6", name: "French Fries", quantity: 2 },
    ],
  },
  {
    id: "ticket-4",
    tableNumber: 4,
    station: "Grill",
    createdAt: placedAgo(50, 4),
    status: "preparing",
    items: [
      { id: "item-7", name: "Grilled salmon", quantity: 2 },
      { id: "item-8", name: "Wild mushroom risotto", quantity: 1 },
    ],
  },
  {
    id: "ticket-5",
    tableNumber: 9,
    station: "Salad",
    createdAt: placedAgo(52, 4),
    status: "preparing",
    items: [
      { id: "item-9", name: "Burrata & heirloom tomato", quantity: 1 },
      { id: "item-10", name: "Soup of the day", quantity: 1 },
    ],
  },
  {
    id: "ticket-6",
    tableNumber: 7,
    station: "Bar",
    createdAt: placedAgo(50, 59),
    status: "ready",
    items: [
      { id: "item-11", name: "IPA draft", quantity: 2 },
      { id: "item-12", name: "House red, glass", quantity: 1 },
    ],
  },
];

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
    nextStatus: "served",
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
  const [tickets, setTickets] = useState<KitchenTicket[]>(sampleTickets);
  // A shared clock updates every card without creating a timer per ticket.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initialTick = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 1000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, []);

  function updateTicketStatus(
    ticketId: string,
    nextStatus: KitchenTicket["status"],
  ) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: nextStatus } : ticket,
      ),
    );
  }

  const openCount = tickets.filter((ticket) => ticket.status !== "served").length;

  return (
    <section className="min-h-[calc(100dvh-6rem)] space-y-6 rounded-xl bg-background p-4 text-foreground sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <span
          role="status"
          className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground dark:bg-[#212b32] dark:text-[#9eb0ba]"
        >
          {openCount} open
        </span>
      </header>

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
                        column.status === "ready" &&
                          "dark:border-l-[#46c08a]",
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
                          <p className="text-sm text-muted-foreground dark:text-[#687b87]">
                            {ticket.station}
                          </p>
                        </div>

                        <span
                          role="timer"
                          aria-label={"Elapsed time for table " + ticket.tableNumber}
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
                        aria-label={
                          column.actionLabel + " for table " + ticket.tableNumber
                        }
                        onClick={() =>
                          updateTicketStatus(ticket.id, column.nextStatus)
                        }
                        className="h-11 w-full text-base font-normal text-muted-foreground dark:border-[#26323a] dark:bg-[#1a2228] dark:text-[#9eb0ba] dark:hover:bg-[#212b32]"
                      >
                        {column.actionLabel}
                      </Button>
                    </article>
                  );
                })}

                {columnTickets.length === 0 && (
                  <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground dark:border-[#26323a] dark:text-[#687b87]">
                    No {column.title.toLowerCase()} tickets
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
