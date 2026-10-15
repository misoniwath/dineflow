"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useFloor } from "@/stores/FloorStore";
import {
  Reservation,
  ReservationInput,
  ReservationStatus,
} from "@/types/Reservation";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export const STATUS_LABEL: Record<ReservationStatus, string> = {
  booked: "Booked",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

/** A table is held for this long around a booking before it can be reused. */
const HOLD_MINUTES = 90;

/* ------------------------------------------------------------------ */
/* Date + time helpers                                                 */
/* ------------------------------------------------------------------ */
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(y, m - 1, d + n));
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const isActive = (r: Reservation) =>
  r.status === "booked" || r.status === "seated";

/* ------------------------------------------------------------------ */
/* Seed data (matches the seeded floor plan)                           */
/* ------------------------------------------------------------------ */
function makeSeed(today: string): Reservation[] {
  const tomorrow = addDays(today, 1);
  return [
    {
      id: "r1",
      name: "Dara Chhun",
      phone: "",
      party: 4,
      date: today,
      time: "18:30",
      notes: "Window if possible",
      status: "booked",
      tableId: "t3",
    },
    {
      id: "r2",
      name: "Sophea Lim",
      phone: "",
      party: 2,
      date: today,
      time: "19:00",
      notes: "",
      status: "booked",
      tableId: "t8",
    },
    {
      id: "r3",
      name: "Kosal Pich",
      phone: "",
      party: 6,
      date: today,
      time: "20:15",
      notes: "Birthday dessert",
      status: "booked",
      tableId: null,
    },
    {
      id: "r4",
      name: "Vanna Sok",
      phone: "",
      party: 2,
      date: today,
      time: "17:30",
      notes: "",
      status: "seated",
      tableId: "t1",
    },
    {
      id: "r5",
      name: "Chenda Roth",
      phone: "",
      party: 5,
      date: tomorrow,
      time: "19:30",
      notes: "",
      status: "booked",
      tableId: null,
    },
    {
      id: "r6",
      name: "Sreyneang Heng",
      phone: "",
      party: 8,
      date: tomorrow,
      time: "18:00",
      notes: "High chair needed",
      status: "booked",
      tableId: null,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */
type ReservationContextValue = {
  reservations: Reservation[];
  addReservation: (input: ReservationInput) => Reservation;
  updateReservation: (id: string, input: ReservationInput) => void;
  /** Pass null to unassign. */
  assignTable: (id: string, tableId: string | null) => void;
  /** Marks the reservation seated and the table occupied. */
  seatReservation: (id: string) => void;
  /** Marks the party as left and the table as cleaning. */
  completeReservation: (id: string) => void;
  cancelReservation: (id: string, reason: "cancelled" | "no-show") => void;
  /** Another active reservation holding this table near this time, if any. */
  tableConflict: (
    tableId: string,
    date: string,
    time: string,
    excludeId?: string,
  ) => Reservation | undefined;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

function newId() {
  return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Must be rendered inside <FloorProvider>: reservations drive table status.
 */
export function ReservationProvider({ children }: { children: ReactNode }) {
  const { tables, setStatus, updateTable } = useFloor();
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    makeSeed(todayISO()),
  );

  const conflictIn = (
    list: Reservation[],
    tableId: string,
    date: string,
    time: string,
    excludeId?: string,
  ) =>
    list.find(
      (r) =>
        r.id !== excludeId &&
        r.tableId === tableId &&
        isActive(r) &&
        r.date === date &&
        Math.abs(toMinutes(r.time) - toMinutes(time)) < HOLD_MINUTES,
    );

  /** Floor shows "reserved" only for today's bookings. Release it when no
   *  other booking for today still holds the table. */
  function releaseIfUnheld(tableId: string, list: Reservation[]) {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.status !== "reserved") return;
    const today = todayISO();
    const stillHeld = list.some(
      (r) => r.tableId === tableId && r.status === "booked" && r.date === today,
    );
    if (!stillHeld) setStatus(tableId, "free");
  }

  function addReservation(input: ReservationInput) {
    const created: Reservation = {
      ...input,
      id: newId(),
      status: "booked",
      tableId: null,
    };
    setReservations((prev) => [...prev, created]);
    return created;
  }

  function updateReservation(id: string, input: ReservationInput) {
    const current = reservations.find((r) => r.id === id);
    if (!current) return;

    let tableId = current.tableId;
    if (tableId) {
      const table = tables.find((t) => t.id === tableId);
      const tooSmall = !table || table.seats < input.party;
      const clash = conflictIn(
        reservations,
        tableId,
        input.date,
        input.time,
        id,
      );
      if (tooSmall || clash) tableId = null; // no longer a valid fit
    }

    const next = reservations.map((r) =>
      r.id === id ? { ...r, ...input, tableId } : r,
    );
    setReservations(next);
    if (current.tableId && current.tableId !== tableId) {
      releaseIfUnheld(current.tableId, next);
    }
  }

  function assignTable(id: string, tableId: string | null) {
    const current = reservations.find((r) => r.id === id);
    if (!current) return;
    const previous = current.tableId;

    const next = reservations.map((r) => (r.id === id ? { ...r, tableId } : r));
    setReservations(next);

    if (previous && previous !== tableId) releaseIfUnheld(previous, next);

    if (tableId && current.status === "booked" && current.date === todayISO()) {
      const table = tables.find((t) => t.id === tableId);
      if (table?.status === "free") setStatus(tableId, "reserved");
    }
  }

  function seatReservation(id: string) {
    const current = reservations.find((r) => r.id === id);
    if (!current || current.status !== "booked" || !current.tableId) return;
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "seated" } : r)),
    );
    setStatus(current.tableId, "occupied");
    updateTable(current.tableId, { guests: current.party });
  }

  function completeReservation(id: string) {
    const current = reservations.find((r) => r.id === id);
    if (!current || current.status !== "seated") return;
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
    );
    if (current.tableId) setStatus(current.tableId, "cleaning");
  }

  function cancelReservation(id: string, reason: "cancelled" | "no-show") {
    const current = reservations.find((r) => r.id === id);
    if (!current) return;
    const next = reservations.map((r) =>
      r.id === id ? { ...r, status: reason } : r,
    );
    setReservations(next);
    if (current.tableId) releaseIfUnheld(current.tableId, next);
  }

  const value: ReservationContextValue = {
    reservations,
    addReservation,
    updateReservation,
    assignTable,
    seatReservation,
    completeReservation,
    cancelReservation,
    tableConflict: (tableId, date, time, excludeId) =>
      conflictIn(reservations, tableId, date, time, excludeId),
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationContext);
  if (!ctx) {
    throw new Error(
      "useReservations must be used inside <ReservationProvider>",
    );
  }
  return ctx;
}
