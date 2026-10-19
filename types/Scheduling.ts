export type StaffRole = "server" | "host" | "kitchen" | "manager" | "owner";

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
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
