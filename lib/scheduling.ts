import type { Shift, StaffMember, TimeEntry } from "@/types/Scheduling";

export const RESTAURANT_TIME_ZONE = "Asia/Phnom_Penh";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeInputFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const rangeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function getRestaurantDate(timestamp: string) {
  // Assemble explicitly instead of relying on a locale's separator order.
  const parts = dateFormatter.formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getRestaurantTimeInput(timestamp: string) {
  return timeInputFormatter.format(new Date(timestamp));
}

export function formatRestaurantTime(timestamp: string) {
  return timeFormatter.format(new Date(timestamp));
}

export function formatScheduleDate(date: string) {
  return dayFormatter.format(new Date(`${date}T12:00:00+07:00`));
}

export function addCalendarDays(date: string, count: number) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + count);
  return day.toISOString().slice(0, 10);
}

export function getWeekStart(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addCalendarDays(date, -((weekday + 6) % 7));
}

export function getWeekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(weekStart, index),
  );
}

export function formatWeekRange(weekStart: string) {
  return rangeFormatter.formatRange(
    new Date(`${weekStart}T00:00:00+07:00`),
    new Date(`${addCalendarDays(weekStart, 6)}T00:00:00+07:00`),
  );
}

export function toRestaurantTimestamp(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new RangeError("Enter valid start and end dates and times.");
  }

  // Phnom Penh uses UTC+07:00 throughout the year; never use the device zone.
  const timestamp = `${date}T${time}:00+07:00`;
  if (
    !Number.isFinite(Date.parse(timestamp)) ||
    getRestaurantDate(timestamp) !== date ||
    getRestaurantTimeInput(timestamp) !== time
  ) {
    throw new RangeError("Enter valid start and end dates and times.");
  }
  return timestamp;
}

export function getShiftError(
  shift: Shift,
  shifts: Shift[],
  staff: StaffMember[],
) {
  if (!staff.some((person) => person.id === shift.staffId)) {
    return "Choose an employee.";
  }
  const start = Date.parse(shift.startsAt);
  const end = Date.parse(shift.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "Enter valid start and end dates and times.";
  }
  if (end <= start) {
    return "The end must be after the start. For an overnight shift, choose the following end date.";
  }
  const overlaps = shifts.some(
    (existing) =>
      existing.id !== shift.id &&
      existing.staffId === shift.staffId &&
      start < Date.parse(existing.endsAt) &&
      end > Date.parse(existing.startsAt),
  );
  return overlaps ? "This employee already has a shift during that time." : null;
}

export function saveShift(
  shifts: Shift[],
  shift: Shift,
  staff: StaffMember[],
) {
  const error = getShiftError(shift, shifts, staff);
  if (error) throw new RangeError(error);
  return [...shifts.filter((existing) => existing.id !== shift.id), shift].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
}

export function deleteShift(shifts: Shift[], shiftId: string) {
  return shifts.filter((shift) => shift.id !== shiftId);
}

export function getShiftsForDay(shifts: Shift[], staffId: string, date: string) {
  const start = Date.parse(toRestaurantTimestamp(date, "00:00"));
  const end = Date.parse(toRestaurantTimestamp(addCalendarDays(date, 1), "00:00"));
  // Half-open intervals show overnight continuations, excluding midnight ends.
  return shifts
    .filter(
      (shift) =>
        shift.staffId === staffId &&
        Date.parse(shift.startsAt) < end &&
        Date.parse(shift.endsAt) > start,
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function getActiveTimeEntry(entries: TimeEntry[], staffId: string) {
  return entries.find(
    (entry) => entry.staffId === staffId && entry.clockedOutAt === null,
  );
}

export function clockIn(entries: TimeEntry[], entry: TimeEntry) {
  if (getActiveTimeEntry(entries, entry.staffId)) return entries;
  if (
    !Number.isFinite(Date.parse(entry.clockedInAt)) ||
    entry.clockedOutAt !== null ||
    entries.some((existing) => existing.id === entry.id)
  ) {
    throw new RangeError("Enter a valid, new clock-in record.");
  }
  return [...entries, entry];
}

export function clockOut(entries: TimeEntry[], staffId: string, timestamp: string) {
  const active = getActiveTimeEntry(entries, staffId);
  if (!active) return entries;
  if (
    !Number.isFinite(Date.parse(timestamp)) ||
    Date.parse(timestamp) < Date.parse(active.clockedInAt)
  ) {
    throw new RangeError("Clock-out time cannot be before clock-in time.");
  }
  return entries.map((entry) =>
    entry.id === active.id ? { ...entry, clockedOutAt: timestamp } : entry,
  );
}

export function getAttendanceForDay(entries: TimeEntry[], date: string) {
  const start = Date.parse(toRestaurantTimestamp(date, "00:00"));
  const end = Date.parse(toRestaurantTimestamp(addCalendarDays(date, 1), "00:00"));
  return entries
    .filter(
      (entry) =>
        Date.parse(entry.clockedInAt) < end &&
        (entry.clockedOutAt === null || Date.parse(entry.clockedOutAt) >= start),
    )
    .sort((a, b) => Date.parse(b.clockedInAt) - Date.parse(a.clockedInAt));
}
