export type ReservationStatus =
  | "booked"
  | "seated"
  | "completed"
  | "cancelled"
  | "no-show";

export type Reservation = {
  id: string;
  name: string;
  phone: string;
  party: number;
  date: string;
  time: string;
  notes?: string;
  status: ReservationStatus;
  tableId: string | null;
};

export type ReservationInput = Pick<
  Reservation,
  "name" | "phone" | "party" | "date" | "time" | "notes"
>;

export type FormState = {
  name: string;
  phone: string;
  party: string;
  date: string;
  time: string;
  notes: string;
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

export type Group = "upcoming" | "seated" | "done";
