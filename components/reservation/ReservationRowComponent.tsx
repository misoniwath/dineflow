import {
  useReservations,
  formatTime,
  STATUS_LABEL,
} from "@/stores/ReservationStore";
import { useFloor } from "@/stores/FloorStore";
import { Reservation, ReservationStatus } from "@/types/Reservation";
import { cn } from "@/lib/utils";

import TablePickerComponent from "@/components/reservation/TablePickerComponent";
import { Pencil, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReservationRowComponent({
  r,
  today,
  onEdit,
  onCancel,
}: {
  r: Reservation;
  today: string;
  onEdit: (r: Reservation) => void;
  onCancel: (r: Reservation) => void;
}) {
  const { tables } = useFloor();
  const { seatReservation, completeReservation } = useReservations();

  const statusBadge: Record<ReservationStatus, string> = {
    booked: "bg-secondary text-secondary-foreground",
    seated: "bg-primary text-primary-foreground",
    completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-muted text-muted-foreground",
    "no-show": "bg-red-500/15 text-red-700 dark:text-red-400",
  };

  const table = tables.find((t) => t.id === r.tableId);
  const isToday = r.date === today;

  const seatBlockedReason = !isToday
    ? "Only today's reservations can be seated"
    : !table
      ? "Assign a table first"
      : table.status === "occupied"
        ? `Table ${table.number} is occupied`
        : null;

  return (
    <article
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3",
        r.status === "seated" && "border-primary/60",
        (r.status === "cancelled" || r.status === "no-show") && "opacity-70",
      )}
    >
      <div className="w-20 shrink-0 text-base font-semibold tabular-nums">
        {formatTime(r.time)}
      </div>

      <div className="min-w-40 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{r.name}</span>
          <Badge
            className={cn("rounded-full font-normal", statusBadge[r.status])}
          >
            {STATUS_LABEL[r.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <Users className="size-3.5" />
            Party of {r.party}
          </span>
          {r.phone && <span className="tabular-nums">{r.phone}</span>}
          {r.notes && <span className="truncate">{r.notes}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {r.status === "booked" ? (
          <TablePickerComponent reservation={r} today={today} />
        ) : table ? (
          <Badge variant="secondary" className="rounded-full">
            Table {table.number}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No table</span>
        )}

        {r.status === "booked" && (
          <>
            <Button
              size="sm"
              disabled={!!seatBlockedReason}
              title={seatBlockedReason ?? undefined}
              onClick={() => seatReservation(r.id)}
            >
              Seat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Edit ${r.name}'s reservation`}
              onClick={() => onEdit(r)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              aria-label={`Cancel ${r.name}'s reservation`}
              onClick={() => onCancel(r)}
            >
              <X className="size-4" />
            </Button>
          </>
        )}

        {r.status === "seated" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => completeReservation(r.id)}
          >
            Party left
          </Button>
        )}
      </div>
    </article>
  );
}
