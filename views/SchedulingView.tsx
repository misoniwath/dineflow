"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AttendancePanel from "@/components/scheduling/AttendancePanel";
import ShiftForm from "@/components/scheduling/ShiftForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addCalendarDays,
  clockIn,
  clockOut,
  deleteShift,
  formatRestaurantTime,
  formatScheduleDate,
  formatWeekRange,
  getRestaurantDate,
  getShiftsForDay,
  getWeekDates,
  getWeekStart,
  saveShift,
} from "@/lib/scheduling";
import {
  createSampleShifts,
  createSampleTimeEntries,
  sampleStaff,
} from "@/lib/scheduling-samples";
import { cn, uid } from "@/lib/utils";
import type { Shift, StaffRole, TimeEntry } from "@/types/Scheduling";

const roleLabels: Record<StaffRole, string> = {
  server: "Server",
  host: "Host",
  kitchen: "Kitchen",
  manager: "Manager",
  owner: "Owner",
};

const roleColors: Record<StaffRole, string> = {
  server: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  host: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  kitchen:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  manager: "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  owner: "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

type EditorState = { shift: Shift | null; staffId: string; date: string };

export default function SchedulingView({ initialNow }: { initialNow: string }) {
  const [now, setNow] = useState(initialNow);
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(getRestaurantDate(initialNow)),
  );
  const [shifts, setShifts] = useState<Shift[]>(() =>
    createSampleShifts(initialNow),
  );
  const [entries, setEntries] = useState<TimeEntry[]>(() =>
    createSampleTimeEntries(initialNow),
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const updateClock = () => setNow(new Date().toISOString());
    const initialTick = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 30_000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, []);

  const today = getRestaurantDate(now);
  const days = getWeekDates(weekStart);

  function openNewShift(staffId: string, date: string) {
    setEditor({ shift: null, staffId, date });
  }

  function handleSave(shift: Shift) {
    setShifts((current) => saveShift(current, shift, sampleStaff));
    setNotice(editor?.shift ? "Shift updated." : "Shift added.");
    setEditor(null);
  }

  function handleDelete(shiftId: string) {
    setShifts((current) => deleteShift(current, shiftId));
    setNotice("Shift deleted.");
    setEditor(null);
  }

  function handleClockIn(staffId: string) {
    const timestamp = new Date().toISOString();
    const entry: TimeEntry = {
      id: uid(),
      staffId,
      clockedInAt: timestamp,
      clockedOutAt: null,
    };
    // Functional updates ensure repeated clicks cannot create two active entries.
    setEntries((current) => clockIn(current, entry));
    setNow(timestamp);
  }

  function handleClockOut(staffId: string) {
    const timestamp = new Date().toISOString();
    setEntries((current) => clockOut(current, staffId, timestamp));
    setNow(timestamp);
  }

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="scheduling-heading">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 id="scheduling-heading" className="text-2xl font-semibold">
            Scheduling
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan the week and track attendance.
          </p>
        </div>
        <Button
          type="button"
          onClick={() =>
            openNewShift(
              sampleStaff[0].id,
              days.includes(today) ? today : weekStart,
            )
          }
        >
          <Plus aria-hidden="true" /> Add shift
        </Button>
      </header>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 aria-live="polite" className="text-lg font-medium">
              {formatWeekRange(weekStart)}
            </h2>
            <nav aria-label="Schedule week" className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label="Previous week"
                size="icon"
                onClick={() =>
                  setWeekStart((current) => addCalendarDays(current, -7))
                }
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const timestamp = new Date().toISOString();
                  setNow(timestamp);
                  setWeekStart(getWeekStart(getRestaurantDate(timestamp)));
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label="Next week"
                size="icon"
                onClick={() =>
                  setWeekStart((current) => addCalendarDays(current, 7))
                }
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Role color legend">
            {(["server", "host", "kitchen", "manager"] as const).map((role) => (
              <span
                key={role}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium",
                  roleColors[role],
                )}
              >
                {roleLabels[role]}
              </span>
            ))}
          </div>

          <div
            className="min-w-0 overflow-x-auto rounded-xl border bg-card focus-visible:outline-2 focus-visible:outline-ring"
            role="region"
            aria-label="Weekly schedule, scroll horizontally to see all days"
            tabIndex={0}
          >
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <caption className="sr-only">
                Employee shifts for {formatWeekRange(weekStart)}, Asia/Phnom_Penh
              </caption>
              <thead>
                <tr className="border-b">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 w-36 border-r bg-card p-4 text-left font-medium"
                  >
                    Employee
                  </th>
                  {days.map((date, index) => (
                    <th
                      key={date}
                      scope="col"
                      aria-current={date === today ? "date" : undefined}
                      className={cn(
                        "w-36 border-r p-3 text-center font-medium last:border-r-0",
                        date === today && "bg-blue-500/10",
                      )}
                    >
                      <span className="block text-xs text-muted-foreground">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                      </span>
                      <span
                        className={cn(
                          "mt-1 inline-flex size-8 items-center justify-center rounded-full",
                          date === today &&
                            "bg-primary font-semibold text-primary-foreground",
                        )}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {date === today && <span className="sr-only">Today</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleStaff.map((person) => (
                  <tr key={person.id} className="border-b last:border-b-0">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r bg-card p-4 text-left font-medium"
                    >
                      <span className="block">{person.name}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {roleLabels[person.role]}
                      </span>
                    </th>
                    {days.map((date) => {
                      const dayShifts = getShiftsForDay(shifts, person.id, date);
                      return (
                        <td
                          key={date}
                          className={cn(
                            "h-28 border-r p-2 align-top last:border-r-0",
                            date === today && "bg-blue-500/5",
                          )}
                        >
                          {dayShifts.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => openNewShift(person.id, date)}
                              aria-label={`Add shift for ${person.name} on ${formatScheduleDate(date)}`}
                              className="flex min-h-24 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <span aria-hidden="true">—</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts.map((shift) => {
                                const startDate = getRestaurantDate(shift.startsAt);
                                const endDate = getRestaurantDate(shift.endsAt);
                                const times = `${formatRestaurantTime(shift.startsAt)} – ${formatRestaurantTime(shift.endsAt)}`;
                                return (
                                  <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() =>
                                      setEditor({ shift, staffId: person.id, date })
                                    }
                                    aria-label={`Edit ${person.name}'s shift, ${formatScheduleDate(startDate)} ${times}, ending ${formatScheduleDate(endDate)}`}
                                    title={shift.notes || undefined}
                                    className={cn(
                                      "block w-full rounded-lg border px-2 py-2.5 text-left text-xs leading-5 transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring",
                                      roleColors[person.role],
                                    )}
                                  >
                                    <span className="block font-medium">
                                      {times}
                                    </span>
                                    {startDate !== endDate && (
                                      <span className="block text-[11px]">
                                        {date !== startDate
                                          ? "Continues"
                                          : "Overnight"}{" "}
                                        · ends {formatScheduleDate(endDate)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            All dates and times use Asia/Phnom_Penh (UTC+07:00). Click a shift to
            edit or an empty cell to add one.
          </p>
          <p role="status" className="min-h-5 text-sm text-muted-foreground">
            {notice}
          </p>
        </div>

        <AttendancePanel
          staff={sampleStaff}
          entries={entries}
          today={today}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
        />
      </div>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor?.shift ? "Edit shift" : "Add shift"}
            </DialogTitle>
            <DialogDescription>
              All shift dates and times are in Asia/Phnom_Penh (UTC+07:00).
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <ShiftForm
              shift={editor.shift}
              defaultStaffId={editor.staffId}
              defaultDate={editor.date}
              staff={sampleStaff}
              shifts={shifts}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancel={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
