import { useState } from "react";
import Link from "next/link";

import {
  useReservations,
  formatDate,
  addDays,
} from "@/stores/ReservationStore";
import {
  Reservation,
  ReservationInput,
  ReservationStatus,
  Group,
} from "@/types/Reservation";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";

import ReservationFormComponent from "@/components/reservation/ReservationFormComponent";
import ReservationRowComponent from "@/components/reservation/ReservationRowComponent";
import CalendarGridComponent from "@/components/reservation/CalendarGridComponent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReservationsBoardComponent({
  today,
}: {
  today: string;
}) {
  const { reservations, addReservation, updateReservation, cancelReservation } =
    useReservations();

  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<Group>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(today.slice(0, 7)); // "YYYY-MM"

  const groupOf = (s: ReservationStatus): Group =>
    s === "booked" ? "upcoming" : s === "seated" ? "seated" : "done";

  const groupLabel: Record<Group, string> = {
    upcoming: "Upcoming",
    seated: "Seated",
    done: "Done",
  };

  /* ------------------------------------------------------------------ */
  /* Month calendar                                                      */
  /* ------------------------------------------------------------------ */
  const shiftMonth = (ym: string, n: number) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

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

          <CalendarGridComponent
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
            <ReservationRowComponent
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
          <ReservationFormComponent
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
