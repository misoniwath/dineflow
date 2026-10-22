import "server-only";

import { and, asc, desc, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { staffShifts, staffTimeEntries, users } from "@/lib/db/schema";
import {
  addCalendarDays,
  getRestaurantDate,
  getWeekStart,
  toRestaurantTimestamp,
} from "@/lib/scheduling";
import type { ScheduleData, Shift, TimeEntry } from "@/types/Scheduling";

export class SchedulingError extends Error {
  constructor(
    message: string,
    public status: 400 | 409 = 400,
  ) {
    super(message);
    this.name = "SchedulingError";
  }
}

export async function getStaffSchedule(
  requestedWeek: string | null,
  viewer: Pick<typeof users.$inferSelect, "id" | "role">,
): Promise<ScheduleData> {
  const canManageSchedule = viewer.role === "manager" || viewer.role === "owner";
  const today = getRestaurantDate(new Date().toISOString());
  const weekStart = requestedWeek ?? getWeekStart(today);
  let weekFrom: Date;
  let weekUntil: Date;
  try {
    weekFrom = new Date(toRestaurantTimestamp(weekStart, "00:00"));
    if (getWeekStart(weekStart) !== weekStart) {
      throw new RangeError("Expected a Monday");
    }
    weekUntil = new Date(
      toRestaurantTimestamp(addCalendarDays(weekStart, 7), "00:00"),
    );
  } catch {
    throw new SchedulingError(
      "weekStart must be a valid Monday in YYYY-MM-DD format",
    );
  }

  const todayFrom = new Date(toRestaurantTimestamp(today, "00:00"));
  const todayUntil = new Date(
    toRestaurantTimestamp(addCalendarDays(today, 1), "00:00"),
  );
  // The viewer is authenticated by the route; limit staff reads in SQL.
  const [staff, shifts, entries] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(canManageSchedule ? undefined : eq(users.id, viewer.id))
      .orderBy(asc(users.name), asc(users.id)),
    db
      .select()
      .from(staffShifts)
      .where(
        and(
          lt(staffShifts.startsAt, weekUntil),
          gt(staffShifts.endsAt, weekFrom),
          canManageSchedule ? undefined : eq(staffShifts.staffId, viewer.id),
        ),
      )
      .orderBy(asc(staffShifts.startsAt)),
    db
      .select()
      .from(staffTimeEntries)
      .where(
        and(
          canManageSchedule ? undefined : eq(staffTimeEntries.staffId, viewer.id),
          or(
            isNull(staffTimeEntries.clockedOutAt),
            and(
              lt(staffTimeEntries.clockedInAt, todayUntil),
              gte(staffTimeEntries.clockedOutAt, todayFrom),
            ),
          ),
        ),
      )
      .orderBy(desc(staffTimeEntries.clockedInAt)),
  ]);
  return {
    currentUserId: viewer.id,
    canManageSchedule,
    staff,
    shifts: shifts.map((shift) => ({
      id: shift.id,
      staffId: shift.staffId,
      startsAt: shift.startsAt.toISOString(),
      endsAt: shift.endsAt.toISOString(),
      notes: shift.notes,
    })),
    entries: entries.map((entry) => ({
      id: entry.id,
      staffId: entry.staffId,
      clockedInAt: entry.clockedInAt.toISOString(),
      clockedOutAt: entry.clockedOutAt?.toISOString() ?? null,
    })),
  };
}

function parseTimestamp(value: unknown): Date {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    value.startsWith("0000")
  ) {
    throw new SchedulingError("Enter valid dates and times with a time zone.");
  }

  const date = new Date(value);
  const calendar = new Date(`${value.slice(0, 19)}Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
    throw new SchedulingError("Enter valid start and end dates and times.");
  }

  return date;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function recordStaffAttendance(input: unknown): Promise<TimeEntry> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SchedulingError("An attendance action is required.");
  }
  const body = input as Record<string, unknown>;
  if (!isUuid(body.staffId)) {
    throw new SchedulingError("Choose an employee.");
  }
  if (body.action !== "clock-in" && body.action !== "clock-out") {
    throw new SchedulingError("Choose clock in or clock out.");
  }
  if (body.action === "clock-out" && !isUuid(body.entryId)) {
    throw new SchedulingError("Choose the attendance record to clock out.");
  }
  const { staffId, action, entryId } = body;

  return db.transaction(async (tx) => {
    // Use the same employee lock as shift creation to serialize attendance changes.
    const [employee] = await tx
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1)
      .for("update");
    if (!employee) {
      throw new SchedulingError("Choose an employee.");
    }
    if (action === "clock-in" && !employee.isActive) {
      throw new SchedulingError("Only active employees can clock in.");
    }

    const [active] = await tx
      .select()
      .from(staffTimeEntries)
      .where(
        and(
          eq(staffTimeEntries.staffId, staffId),
          isNull(staffTimeEntries.clockedOutAt),
        ),
      )
      .limit(1);

    let saved: typeof staffTimeEntries.$inferSelect;
    if (action === "clock-in") {
      if (active) {
        throw new SchedulingError(
          "This employee is already clocked in. Refresh attendance.",
          409,
        );
      }
      // Both the ID and clock-in time come from database defaults.
      [saved] = await tx.insert(staffTimeEntries).values({ staffId }).returning();
    } else {
      if (!active || active.id !== entryId) {
        throw new SchedulingError(
          "Attendance changed. Refresh and try again.",
          409,
        );
      }
      // Target the displayed entry so a stale tab cannot close a later clock-in.
      [saved] = await tx
        .update(staffTimeEntries)
        .set({ clockedOutAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(staffTimeEntries.id, active.id),
            isNull(staffTimeEntries.clockedOutAt),
          ),
        )
        .returning();
    }
    return {
      id: saved.id,
      staffId: saved.staffId,
      clockedInAt: saved.clockedInAt.toISOString(),
      clockedOutAt: saved.clockedOutAt?.toISOString() ?? null,
    };
  });
}

export async function createStaffShift(input: unknown): Promise<Shift> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SchedulingError("A shift is required.");
  }
  const body = input as Record<string, unknown>;
  if (
    typeof body.staffId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.staffId,
    )
  ) {
    throw new SchedulingError("Choose an employee.");
  }
  const staffId = body.staffId;
  const startsAt = parseTimestamp(body.startsAt);
  const endsAt = parseTimestamp(body.endsAt);
  if (endsAt <= startsAt) {
    throw new SchedulingError(
      "The end must be after the start. For an overnight shift, choose the following end date.",
    );
  }
  if (body.notes !== undefined && typeof body.notes !== "string") {
    throw new SchedulingError("Shift notes must be text.");
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 2000) {
    throw new SchedulingError("Keep shift notes within 2000 characters.");
  }

  return db.transaction(async (tx) => {
    // Serialize creation for each employee before checking for overlapping shifts.
    const [employee] = await tx
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1)
      .for("update");
    if (!employee || !employee.isActive) {
      throw new SchedulingError("Choose an active employee.");
    }

    const [overlap] = await tx
      .select({ id: staffShifts.id })
      .from(staffShifts)
      .where(
        and(
          eq(staffShifts.staffId, staffId),
          lt(staffShifts.startsAt, endsAt),
          gt(staffShifts.endsAt, startsAt),
        ),
      )
      .limit(1);
    if (overlap) {
      throw new SchedulingError(
        "This employee already has a shift during that time.",
        409,
      );
    }

    const [shift] = await tx
      .insert(staffShifts)
      .values({ staffId, startsAt, endsAt, notes })
      .returning();
    return {
      id: shift.id,
      staffId: shift.staffId,
      startsAt: shift.startsAt.toISOString(),
      endsAt: shift.endsAt.toISOString(),
      notes: shift.notes,
    };
  });
}
