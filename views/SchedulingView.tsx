"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
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
  createShiftApi,
  getScheduleApi,
  recordAttendanceApi,
} from "@/lib/api/scheduling";
import {
  addCalendarDays,
  formatRestaurantTime,
  formatScheduleDate,
  formatWeekRange,
  getRestaurantDate,
  getActiveTimeEntry,
  getShiftsForDay,
  getWeekDates,
  getWeekStart,
} from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import type {
  AttendanceInput,
  ScheduleData,
  Shift,
  StaffRole,
} from "@/types/Scheduling";

const roleLabels: Record<StaffRole, string> = {
  staff: "Staff",
  server: "Server",
  host: "Host",
  kitchen: "Kitchen",
  manager: "Manager",
  owner: "Owner",
};

const roleColors: Record<StaffRole, string> = {
  staff: "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  server: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  host: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  kitchen:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  manager: "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  owner: "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

type ScheduleResult = {
  key: string;
  data: ScheduleData | null;
  error: string | null;
};

export default function SchedulingView({ initialNow }: { initialNow: string }) {
  const [now, setNow] = useState(initialNow);
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(getRestaurantDate(initialNow)),
  );
  const [refreshCount, setRefreshCount] = useState(0);
  const [editor, setEditor] = useState<{
    staffId: string;
    date: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [attendanceSavingId, setAttendanceSavingId] = useState<string | null>(
    null,
  );
  const attendancePending = useRef(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<ScheduleResult>({
    key: "",
    data: null,
    error: null,
  });

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
  const requestKey = `${weekStart}:${today}:${refreshCount}`;
  const loading = result.key !== requestKey;
  const error = loading ? null : result.error;
  const data = loading ? null : result.data;
  const canManageSchedule = data?.canManageSchedule ?? false;
  const staff = data?.staff ?? [];
  const shifts = data?.shifts ?? [];
  const entries = data?.entries ?? [];
  const roles = [...new Set(staff.map((person) => person.role))];
  const activeStaff = staff.filter((person) => person.isActive !== false);
  const busy = saving || attendanceSavingId !== null;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    void getScheduleApi(weekStart, controller.signal).then(
      (schedule) => {
        if (!cancelled) {
          setResult({ key: requestKey, data: schedule, error: null });
        }
      },
      (cause: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Could not load scheduling data.",
          });
        }
      },
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [weekStart, requestKey]);

  function openNewShift(staffId: string, date: string) {
    if (!canManageSchedule) return;
    setNotice("");
    setEditor({ staffId, date });
  }

  async function handleSave(shift: Shift) {
    setSaving(true);
    try {
      const saved = await createShiftApi({
        staffId: shift.staffId,
        startsAt: shift.startsAt,
        endsAt: shift.endsAt,
        notes: shift.notes,
      });
      setEditor(null);
      setNotice("Shift added.");
      setWeekStart(getWeekStart(getRestaurantDate(saved.startsAt)));
      setRefreshCount((count) => count + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleAttendance(action: AttendanceInput["action"]) {
    if (attendancePending.current || saving || loading || error || !data) return;
    const staffId = data.currentUserId;
    const active = getActiveTimeEntry(entries, staffId);
    if (action === "clock-out" && !active) return;

    const input: AttendanceInput =
      action === "clock-in"
        ? { action }
        : { action, entryId: active!.id };
    attendancePending.current = true;
    setAttendanceSavingId(staffId);
    setAttendanceError(null);
    setNotice("");
    try {
      await recordAttendanceApi(input);
      const name =
        staff.find((person) => person.id === staffId)?.name ?? "Employee";
      setNotice(`${name} clocked ${action === "clock-in" ? "in" : "out"}.`);
      setRefreshCount((count) => count + 1);
    } catch (cause) {
      setAttendanceError(
        cause instanceof Error ? cause.message : "Could not save attendance.",
      );
    } finally {
      attendancePending.current = false;
      setAttendanceSavingId(null);
    }
  }

  return (
    <section
      className="min-w-0 space-y-5"
      aria-labelledby="scheduling-heading"
      aria-busy={loading}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 id="scheduling-heading" className="text-2xl font-semibold">
            {data && !canManageSchedule ? "My schedule" : "Scheduling"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data && !canManageSchedule
              ? "View your shifts and record your attendance."
              : "Plan the week and track attendance."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label="Refresh schedule"
            disabled={loading || busy}
            onClick={() => {
              setAttendanceError(null);
              setRefreshCount((count) => count + 1);
            }}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
          {canManageSchedule && (
            <Button
              type="button"
              disabled={
                loading || busy || Boolean(error) || activeStaff.length === 0
              }
              onClick={() => {
                const person = activeStaff[0];
                if (person)
                  openNewShift(
                    person.id,
                    days.includes(today) ? today : weekStart,
                  );
              }}
            >
              <Plus aria-hidden="true" /> Add shift
            </Button>
          )}
        </div>
      </header>

      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {notice}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

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
                disabled={busy}
                onClick={() =>
                  setWeekStart((current) => addCalendarDays(current, -7))
                }
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
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
                disabled={busy}
                onClick={() =>
                  setWeekStart((current) => addCalendarDays(current, 7))
                }
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Role color legend">
            {roles.map((role) => (
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
                Employee shifts for {formatWeekRange(weekStart)},
                Asia/Phnom_Penh
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
                        {
                          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                            index
                          ]
                        }
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
                {(loading || error || staff.length === 0) && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {loading ? (
                        <span role="status">Loading schedule…</span>
                      ) : error ? (
                        "Schedule unavailable. Refresh to try again."
                      ) : (
                        "No staff members found."
                      )}
                    </td>
                  </tr>
                )}
                {staff.map((person) => (
                  <tr key={person.id} className="border-b last:border-b-0">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r bg-card p-4 text-left font-medium"
                    >
                      <span className="block">{person.name}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {roleLabels[person.role]}
                        {person.isActive === false && " · Inactive"}
                      </span>
                    </th>
                    {days.map((date) => {
                      const dayShifts = getShiftsForDay(
                        shifts,
                        person.id,
                        date,
                      );
                      return (
                        <td
                          key={date}
                          className={cn(
                            "h-28 border-r p-2 align-top last:border-r-0",
                            date === today && "bg-blue-500/5",
                          )}
                        >
                          {dayShifts.length === 0 && !canManageSchedule ? (
                            <span className="flex min-h-24 items-center justify-center text-muted-foreground">
                              —
                            </span>
                          ) : dayShifts.length === 0 ? (
                            <button
                              type="button"
                              disabled={busy || person.isActive === false}
                              onClick={() => openNewShift(person.id, date)}
                              aria-label={`Add shift for ${person.name} on ${formatScheduleDate(date)}`}
                              className="flex min-h-24 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span aria-hidden="true">—</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts.map((shift) => {
                                const startDate = getRestaurantDate(
                                  shift.startsAt,
                                );
                                const endDate = getRestaurantDate(shift.endsAt);
                                const times = `${formatRestaurantTime(shift.startsAt)} – ${formatRestaurantTime(shift.endsAt)}`;
                                return (
                                  <div
                                    key={shift.id}
                                    aria-label={`${person.name}'s shift, ${formatScheduleDate(startDate)} ${times}, ending ${formatScheduleDate(endDate)}`}
                                    title={shift.notes || undefined}
                                    className={cn(
                                      "block w-full rounded-lg border px-2 py-2.5 text-left text-xs leading-5",
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
                                  </div>
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
            All dates and times use Asia/Phnom_Penh (UTC+07:00).
          </p>
        </div>

        {data && (
          <AttendancePanel
            staff={staff}
            entries={entries}
            today={today}
            currentUserId={data.currentUserId}
            teamView={canManageSchedule}
            disabled={saving}
            savingStaffId={attendanceSavingId}
            error={attendanceError}
            onClockIn={() => void handleAttendance("clock-in")}
            onClockOut={() => void handleAttendance("clock-out")}
          />
        )}
      </div>

      <Dialog
        open={editor !== null && canManageSchedule}
        onOpenChange={(open) => {
          if (!open && !saving) setEditor(null);
        }}
      >
        <DialogContent
          showCloseButton={!saving}
          className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Add shift</DialogTitle>
            <DialogDescription>
              All shift dates and times are in Asia/Phnom_Penh (UTC+07:00).
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <ShiftForm
              shift={null}
              defaultStaffId={editor.staffId}
              defaultDate={editor.date}
              staff={activeStaff}
              shifts={shifts}
              onSave={handleSave}
              onCancel={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
