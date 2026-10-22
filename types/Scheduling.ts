export type StaffRole =
  | "staff"
  | "server"
  | "host"
  | "kitchen"
  | "manager"
  | "owner";

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  isActive?: boolean;
};

export type Shift = {
  id: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
};

export type TimeEntry = {
  id: string;
  staffId: string;
  clockedInAt: string;
  clockedOutAt: string | null;
};

export type AttendanceInput =
  | { action: "clock-in" }
  | { action: "clock-out"; entryId: string };

export type ShiftInput = Omit<Shift, "id">;
export type ScheduleData = {
  currentUserId: string;
  canManageSchedule: boolean;
  staff: StaffMember[];
  shifts: Shift[];
  entries: TimeEntry[];
};
