import type {
  AttendanceInput,
  ScheduleData,
  Shift,
  ShiftInput,
  TimeEntry,
} from "@/types/Scheduling";

async function readResponse(response: Response, fallback: string) {
  if (response.redirected || response.status === 401) {
    throw new Error("Please sign in again to use Scheduling.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? fallback);
  }
  return data;
}

export async function getScheduleApi(
  weekStart: string,
  signal?: AbortSignal,
): Promise<ScheduleData> {
  const query = new URLSearchParams({ weekStart });
  const response = await fetch(`/api/scheduling?${query}`, {
    cache: "no-store",
    signal,
  });

  const data = await readResponse(response, "Could not load scheduling data.");

  if (
    !data ||
    typeof data.currentUserId !== "string" ||
    typeof data.canManageSchedule !== "boolean" ||
    !Array.isArray(data.staff) ||
    !Array.isArray(data.shifts) ||
    !Array.isArray(data.entries)
  ) {
    throw new Error("Could not load scheduling data.");
  }

  return data;
}

export async function createShiftApi(input: ShiftInput): Promise<Shift> {
  const response = await fetch("/api/scheduling/shifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readResponse(response, "Could not save shift.");
  if (!data?.shift || typeof data.shift.id !== "string") {
    throw new Error("Could not save shift.");
  }
  return data.shift;
}

export async function recordAttendanceApi(
  input: AttendanceInput,
): Promise<TimeEntry> {
  const response = await fetch("/api/scheduling/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readResponse(response, "Could not save attendance.");
  const entry = data?.entry;
  if (
    !entry ||
    typeof entry.id !== "string" ||
    typeof entry.staffId !== "string" ||
    typeof entry.clockedInAt !== "string" ||
    !Number.isFinite(Date.parse(entry.clockedInAt)) ||
    (input.action === "clock-in"
      ? entry.clockedOutAt !== null
      : entry.id !== input.entryId ||
        typeof entry.clockedOutAt !== "string" ||
        !Number.isFinite(Date.parse(entry.clockedOutAt)))
  ) {
    throw new Error("Could not save attendance.");
  }
  return entry;
}
