"use client";

import { Button } from "@/components/ui/button";
import {
  formatRestaurantTime,
  formatScheduleDate,
  getActiveTimeEntry,
  getAttendanceForDay,
  getRestaurantDate,
} from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import type { StaffMember, TimeEntry } from "@/types/Scheduling";

export default function AttendancePanel({
  staff,
  entries,
  today,
  onClockIn,
  onClockOut,
}: {
  staff: StaffMember[];
  entries: TimeEntry[];
  today: string;
  onClockIn: (staffId: string) => void;
  onClockOut: (staffId: string) => void;
}) {
  const todayEntries = getAttendanceForDay(entries, today);
  const activeCount = staff.filter((person) =>
    getActiveTimeEntry(entries, person.id),
  ).length;

  function displayTime(timestamp: string) {
    const date = getRestaurantDate(timestamp);
    return `${date === today ? "" : `${formatScheduleDate(date)}, `}${formatRestaurantTime(timestamp)}`;
  }

  return (
    <aside
      aria-labelledby="attendance-heading"
      className="min-w-0 rounded-xl border bg-card text-card-foreground"
    >
      <header className="space-y-3 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="attendance-heading" className="font-semibold">
            Attendance today
          </h2>
          <span
            role="status"
            className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
          >
            {activeCount} clocked in
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatScheduleDate(today)}
        </p>
      </header>

      <ul className="divide-y">
        {staff.map((person) => {
          // Include active entries from previous dates, including overnight work.
          const active = getActiveTimeEntry(entries, person.id);
          const completed = todayEntries.find(
            (entry) => entry.staffId === person.id && entry.clockedOutAt !== null,
          );
          return (
            <li key={person.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{person.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {person.role}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-xs font-medium",
                    active
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {active ? "Clocked in" : "Clocked out"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {active
                  ? `In since ${displayTime(active.clockedInAt)}`
                  : completed?.clockedOutAt
                    ? `Last out at ${displayTime(completed.clockedOutAt)}`
                    : "No attendance recorded today"}
              </p>
              <Button
                type="button"
                variant={active ? "outline" : "secondary"}
                className="w-full"
                aria-label={`${active ? "Clock out" : "Clock in"} ${person.name}`}
                onClick={() =>
                  active ? onClockOut(person.id) : onClockIn(person.id)
                }
              >
                {active ? "Clock out" : "Clock in"}
              </Button>
            </li>
          );
        })}
      </ul>

      <details className="border-t p-4">
        <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
          Today’s records ({todayEntries.length})
        </summary>
        {todayEntries.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">
            No time entries today.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {todayEntries.map((entry) => (
              <li key={entry.id} className="rounded-lg bg-muted/50 p-3 text-xs">
                <p className="mb-1 font-medium">
                  {staff.find((person) => person.id === entry.staffId)?.name}
                </p>
                <p>In: {displayTime(entry.clockedInAt)}</p>
                <p>
                  {entry.clockedOutAt
                    ? `Out: ${displayTime(entry.clockedOutAt)}`
                    : "Currently working"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </details>
    </aside>
  );
}
