import type { Shift, StaffMember, TimeEntry } from "@/types/Scheduling";
import {
  addCalendarDays,
  getRestaurantDate,
  getWeekStart,
  toRestaurantTimestamp,
} from "./scheduling";

export const sampleStaff: StaffMember[] = [
  { id: "staff-1", name: "Ana", role: "server" },
  { id: "staff-2", name: "Priya", role: "host" },
  { id: "staff-3", name: "DeShawn", role: "kitchen" },
  { id: "staff-4", name: "Sokha", role: "manager" },
  { id: "staff-5", name: "Dara", role: "server" },
];

export function createSampleShifts(now: string): Shift[] {
  const monday = getWeekStart(getRestaurantDate(now));
  return sampleStaff.flatMap((person, personIndex) =>
    [0, 1, 3, 4, 5, 6]
      .filter((day) => (day + personIndex) % 3 !== 2)
      .map((day) => {
        const date = addCalendarDays(monday, day);
        const overnight = person.role === "kitchen" && day === 5;
        return {
          id: `sample-${person.id}-${day}`,
          staffId: person.id,
          startsAt: toRestaurantTimestamp(date, overnight ? "18:00" : "11:00"),
          endsAt: toRestaurantTimestamp(
            overnight ? addCalendarDays(date, 1) : date,
            overnight ? "02:00" : person.role === "host" ? "16:00" : "19:00",
          ),
          notes: overnight ? "Kitchen close and prep for the next day." : "",
        };
      }),
  );
}

export function createSampleTimeEntries(now: string): TimeEntry[] {
  const earlier = (minutes: number) =>
    new Date(Date.parse(now) - minutes * 60_000).toISOString();
  return [
    { id: "time-1", staffId: "staff-1", clockedInAt: earlier(120), clockedOutAt: null },
    { id: "time-2", staffId: "staff-3", clockedInAt: earlier(60), clockedOutAt: null },
    { id: "time-3", staffId: "staff-2", clockedInAt: earlier(90), clockedOutAt: earlier(30) },
  ];
}
