import { Reservation, ReservationStatus } from "@/types/Reservation";
import { addDays, formatDate, formatTime } from "@/stores/ReservationStore";
import { cn } from "@/lib/utils";

export default function CalendarGridComponent({
  month,
  selected,
  today,
  reservations,
  onSelect,
}: {
  month: string;
  selected: string;
  today: string;
  reservations: Reservation[];
  onSelect: (iso: string) => void;
}) {
  // Cancelled and no-show bookings don't take up a slot, so leave them off.
  const byDate = new Map<string, Reservation[]>();
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /** Always 6 weeks (42 days), starting on the Monday on or before the 1st,
   *  so the grid height doesn't jump between months. */
  function monthCells(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const first = `${ym}-01`;
    return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
  }

  const chipStyle: Record<ReservationStatus, string> = {
    booked: "bg-secondary text-secondary-foreground",
    seated: "bg-primary text-primary-foreground",
    completed: "bg-muted text-muted-foreground",
    cancelled: "",
    "no-show": "",
  };

  for (const r of reservations) {
    if (r.status === "cancelled" || r.status === "no-show") continue;
    byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-xs text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {monthCells(month).map((iso) => {
          const day = Number(iso.slice(8));
          const inMonth = iso.startsWith(month);
          const items = [...(byDate.get(iso) ?? [])].sort((a, b) =>
            a.time.localeCompare(b.time),
          );
          const needsTable = items.some(
            (r) => r.status === "booked" && !r.tableId,
          );
          const isSelected = iso === selected;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${formatDate(iso)}, ${items.length} ${items.length === 1 ? "reservation" : "reservations"}`}
              className={cn(
                "flex min-h-14 flex-col gap-1 bg-card p-1.5 text-left transition-colors hover:bg-muted sm:min-h-24 sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                !inMonth && "bg-muted/40 text-muted-foreground",
                isSelected && "ring-2 ring-inset ring-primary",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {day}
              </span>

              {/* Wide screens: show the first two bookings */}
              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {items.slice(0, 2).map((r) => (
                  <span
                    key={r.id}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[11px] tabular-nums",
                      chipStyle[r.status],
                      r.status === "booked" &&
                        !r.tableId &&
                        "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {formatTime(r.time)} {r.name.split(" ")[0]}
                  </span>
                ))}
                {items.length > 2 && (
                  <span className="px-1.5 text-[11px] text-muted-foreground">
                    +{items.length - 2} more
                  </span>
                )}
              </div>

              {/* Phones: just a count */}
              {items.length > 0 && (
                <span
                  className={cn(
                    "mt-auto text-[11px] tabular-nums sm:hidden",
                    needsTable
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
                  )}
                >
                  {items.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
