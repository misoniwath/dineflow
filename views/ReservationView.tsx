"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ZONES, useFloor } from "@/stores/FloorStore";
import {
  STATUS_LABEL,
  addDays,
  formatDate,
  formatTime,
  todayISO,
  useReservations,
  type Reservation,
  type ReservationInput,
  type ReservationStatus,
} from "@/stores/ReservationStore";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

type Group = "upcoming" | "seated" | "done";

const groupOf = (s: ReservationStatus): Group =>
  s === "booked" ? "upcoming" : s === "seated" ? "seated" : "done";

const groupLabel: Record<Group, string> = {
  upcoming: "Upcoming",
  seated: "Seated",
  done: "Done",
};

const statusBadge: Record<ReservationStatus, string> = {
  booked: "bg-secondary text-secondary-foreground",
  seated: "bg-primary text-primary-foreground",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
  "no-show": "bg-red-500/15 text-red-700 dark:text-red-400",
};

/* ------------------------------------------------------------------ */
/* Table picker (Command)                                              */
/* ------------------------------------------------------------------ */

function TablePicker({
  reservation,
  today,
}: {
  reservation: Reservation;
  today: string;
}) {
  const { tables } = useFloor();
  const { assignTable, tableConflict } = useReservations();
  const [open, setOpen] = useState(false);

  const current = tables.find((t) => t.id === reservation.tableId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              !current && "border-dashed text-amber-700 dark:text-amber-400",
            )}
          />
        }
      >
        {current ? (
          <>
            Table {current.number}
            <span className="text-xs font-normal text-muted-foreground">
              {current.zone}
            </span>
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Assign table
          </>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search tables or areas" />
          <CommandList>
            <CommandEmpty>No tables found.</CommandEmpty>
            {ZONES.map((zone) => {
              const inZone = tables
                .filter((t) => t.zone === zone)
                .sort((a, b) => a.number - b.number);
              if (inZone.length === 0) return null;
              return (
                <CommandGroup key={zone} heading={zone}>
                  {inZone.map((t) => {
                    const tooSmall = t.seats < reservation.party;
                    const clash = tableConflict(
                      t.id,
                      reservation.date,
                      reservation.time,
                      reservation.id,
                    );
                    const inUse =
                      reservation.date === today && t.status === "occupied";
                    const isCurrent = t.id === reservation.tableId;
                    const hint = tooSmall
                      ? "Too small"
                      : clash
                        ? `Booked ${formatTime(clash.time)}`
                        : inUse
                          ? "In use now"
                          : "";
                    return (
                      <CommandItem
                        key={t.id}
                        value={`Table ${t.number} ${zone}`}
                        disabled={tooSmall || !!clash}
                        onSelect={() => {
                          assignTable(reservation.id, t.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            isCurrent ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1">Table {t.number}</span>
                        <span className="text-xs text-muted-foreground">
                          {hint ? `${hint} · ` : ""}
                          {t.seats} seats
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
            {reservation.tableId && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="remove-table"
                    className="justify-center"
                    onSelect={() => {
                      assignTable(reservation.id, null);
                      setOpen(false);
                    }}
                  >
                    Remove table
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Reservation row                                                     */
/* ------------------------------------------------------------------ */

function ReservationRow({
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
          <TablePicker reservation={r} today={today} />
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

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

type FormState = {
  name: string;
  phone: string;
  party: string;
  date: string;
  time: string;
  notes: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReservationForm({
  reservation,
  defaultDate,
  onSubmit,
}: {
  reservation: Reservation | null;
  defaultDate: string;
  onSubmit: (input: ReservationInput) => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    name: reservation?.name ?? "",
    phone: reservation?.phone ?? "",
    party: String(reservation?.party ?? 2),
    date: reservation?.date ?? defaultDate,
    time: reservation?.time ?? "19:00",
    notes: reservation?.notes ?? "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const party = Number(form.party);

    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Enter the guest's name.";
    if (!Number.isInteger(party) || party < 1 || party > 20)
      next.party = "Enter a party of 1 to 20.";
    if (!form.date) next.date = "Choose a date.";
    if (!form.time) next.time = "Choose a time.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      party,
      date: form.date,
      time: form.time,
      notes: form.notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="name"
          label="Guest name"
          error={errors.name}
          className="col-span-2"
        >
          <Input
            id="name"
            placeholder="e.g. Dara Chhun"
            value={form.name}
            aria-invalid={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field id="party" label="Party size" error={errors.party}>
          <Input
            id="party"
            type="number"
            min="1"
            max="20"
            value={form.party}
            aria-invalid={!!errors.party}
            onChange={(e) => set("party", e.target.value)}
          />
        </Field>
        <Field id="phone" label="Phone (optional)">
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field id="date" label="Date" error={errors.date}>
          <Input
            id="date"
            type="date"
            value={form.date}
            aria-invalid={!!errors.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field id="time" label="Time" error={errors.time}>
          <Input
            id="time"
            type="time"
            value={form.time}
            aria-invalid={!!errors.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </Field>
        <Field id="notes" label="Notes (optional)" className="col-span-2">
          <Input
            id="notes"
            placeholder="Allergies, occasion, seating request"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit">
          {reservation ? "Save changes" : "Add reservation"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Month calendar                                                      */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

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

function CalendarGrid({
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

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

function ReservationsBoard({ today }: { today: string }) {
  const { reservations, addReservation, updateReservation, cancelReservation } =
    useReservations();

  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<Group>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(today.slice(0, 7)); // "YYYY-MM"

  // Keep the calendar's month in step with the selected day.
  const selectDate = (d: string) => {
    setDate(d);
    setMonth(d.slice(0, 7));
  };

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState<Reservation | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (r: Reservation) => {
    setEditing(r);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openCancel = (r: Reservation) => {
    setCancelling(r);
    setCancelOpen(true);
  };

  function handleSave(input: ReservationInput) {
    if (editing) updateReservation(editing.id, input);
    else addReservation(input);
    // Jump to the day that was just saved so the booking is visible.
    selectDate(input.date);
    setTab("upcoming");
    setFormOpen(false);
  }

  function confirmCancel(reason: "cancelled" | "no-show") {
    if (cancelling) cancelReservation(cancelling.id, reason);
    setCancelOpen(false);
  }

  const dayAll = reservations
    .filter((r) => r.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
  const list = dayAll.filter((r) => groupOf(r.status) === tab);

  const countOf = (g: Group) =>
    dayAll.filter((r) => groupOf(r.status) === g).length;
  const live = dayAll.filter(
    (r) => r.status === "booked" || r.status === "seated",
  );
  const covers = live.reduce((sum, r) => sum + r.party, 0);
  const needTable = dayAll.filter(
    (r) => r.status === "booked" && !r.tableId,
  ).length;

  const dateLabel =
    date === today
      ? `Today · ${formatDate(date)}`
      : date === addDays(today, 1)
        ? `Tomorrow · ${formatDate(date)}`
        : formatDate(date);

  return (
    <div className="space-y-4">
      {/* Tabs + actions */}
      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Group)}
          className="w-full lg:w-3/4"
        >
          <TabsList className="w-full">
            {(Object.keys(groupLabel) as Group[]).map((g) => (
              <TabsTrigger
                key={g}
                value={g}
                className="cursor-pointer w-full gap-2 px-3"
              >
                {groupLabel[g]}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {countOf(g)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {/* List / calendar switch */}
          <div
            role="group"
            aria-label="View"
            className="flex items-center rounded-lg border bg-muted p-0.5"
          >
            {(
              [
                { key: "list", label: "List view", icon: List },
                { key: "calendar", label: "Calendar view", icon: CalendarDays },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={view === key ? "default" : "ghost"}
                size="icon"
                className="size-7"
                aria-label={label}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/floor-plan" />}
          >
            <LayoutGrid className="size-4" />
            Floor plan
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Add reservation
          </Button>
        </div>
      </div>

      {view === "list" ? (
        /* Day navigation */
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Previous day"
            onClick={() => selectDate(addDays(date, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-44 text-center text-sm font-medium">
            {dateLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Next day"
            onClick={() => selectDate(addDays(date, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          {date !== today && (
            <Button variant="ghost" size="sm" onClick={() => selectDate(today)}>
              Today
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Month navigation */}
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Previous month"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-44 text-center text-sm font-medium">
              {monthLabel(month)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Next month"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            {(month !== today.slice(0, 7) || date !== today) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectDate(today)}
              >
                Today
              </Button>
            )}
          </div>

          <CalendarGrid
            month={month}
            selected={date}
            today={today}
            reservations={reservations}
            onSelect={selectDate}
          />

          <h2 className="pt-2 text-sm font-semibold">{dateLabel}</h2>
        </>
      )}

      {/* Summary for the selected day */}
      <p className="text-sm tabular-nums text-muted-foreground">
        {live.length} {live.length === 1 ? "reservation" : "reservations"} ·{" "}
        {covers} guests
        {needTable > 0 && (
          <span className="text-amber-700 dark:text-amber-400">
            {" "}
            · {needTable} need a table
          </span>
        )}
      </p>

      {/* List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {tab === "upcoming"
                ? "No upcoming reservations"
                : tab === "seated"
                  ? "No parties seated from reservations"
                  : "Nothing completed or cancelled"}
            </p>
            <p className="text-sm text-muted-foreground">
              {tab === "upcoming"
                ? "Add a booking to hold a table for this day."
                : "They'll show up here once guests are seated or a booking closes."}
            </p>
          </div>
          {tab === "upcoming" && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" />
              Add reservation
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <ReservationRow
              key={r.id}
              r={r}
              today={today}
              onEdit={openEdit}
              onCancel={openCancel}
            />
          ))}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editing
                ? `Edit ${editing.name}'s reservation`
                : "Add reservation"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "If the new time or party size no longer fits the table, the table is released."
                : "Assign a table from the list once it's saved."}
            </DialogDescription>
          </DialogHeader>
          <ReservationForm
            key={formKey}
            reservation={editing}
            defaultDate={date}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Cancel {cancelling?.name}&apos;s reservation?
            </DialogTitle>
            <DialogDescription>
              The table is released on the floor plan. Use no-show if the guests
              didn&apos;t arrive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Keep reservation
            </DialogClose>
            <Button variant="outline" onClick={() => confirmCancel("no-show")}>
              Mark as no-show
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmCancel("cancelled")}
            >
              Cancel reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReservationsView() {
  // "Today" depends on the browser's clock, so render after mount to keep
  // server and client markup identical.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayISO()), []);

  if (!today) return <div className="min-h-96" aria-busy="true" />;
  return <ReservationsBoard today={today} />;
}
