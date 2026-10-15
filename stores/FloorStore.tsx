"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FloorTable, TableInput, TableStatus } from "@/types/Floor";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export const ZONES = ["Main hall", "Patio", "Bar"] as const;
export const STATUS_LABEL: Record<TableStatus, string> = {
  free: "Free",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
};
export const STATUSES = Object.keys(STATUS_LABEL) as TableStatus[];

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */
const seed: FloorTable[] = [
  {
    id: "t1",
    number: 1,
    seats: 2,
    shape: "round",
    zone: "Main hall",
    x: 14,
    y: 26,
    status: "occupied",
    guests: 2,
  },
  {
    id: "t2",
    number: 2,
    seats: 2,
    shape: "round",
    zone: "Main hall",
    x: 14,
    y: 56,
    status: "free",
    guests: 0,
  },
  {
    id: "t3",
    number: 3,
    seats: 4,
    shape: "square",
    zone: "Main hall",
    x: 38,
    y: 26,
    status: "reserved",
    guests: 0,
  },
  {
    id: "t4",
    number: 4,
    seats: 4,
    shape: "square",
    zone: "Main hall",
    x: 38,
    y: 56,
    status: "occupied",
    guests: 3,
  },
  {
    id: "t5",
    number: 5,
    seats: 6,
    shape: "rect",
    zone: "Main hall",
    x: 68,
    y: 28,
    status: "free",
    guests: 0,
  },
  {
    id: "t6",
    number: 6,
    seats: 6,
    shape: "rect",
    zone: "Main hall",
    x: 68,
    y: 60,
    status: "occupied",
    guests: 5,
  },
  {
    id: "t7",
    number: 7,
    seats: 4,
    shape: "square",
    zone: "Main hall",
    x: 38,
    y: 82,
    status: "free",
    guests: 0,
  },
  {
    id: "t8",
    number: 8,
    seats: 4,
    shape: "round",
    zone: "Patio",
    x: 24,
    y: 36,
    status: "reserved",
    guests: 0,
  },
  {
    id: "t9",
    number: 9,
    seats: 4,
    shape: "round",
    zone: "Patio",
    x: 52,
    y: 62,
    status: "free",
    guests: 0,
  },
  {
    id: "t10",
    number: 10,
    seats: 4,
    shape: "round",
    zone: "Patio",
    x: 78,
    y: 34,
    status: "occupied",
    guests: 3,
  },
  {
    id: "t11",
    number: 11,
    seats: 2,
    shape: "round",
    zone: "Bar",
    x: 24,
    y: 55,
    status: "free",
    guests: 0,
  },
  {
    id: "t12",
    number: 12,
    seats: 2,
    shape: "round",
    zone: "Bar",
    x: 50,
    y: 55,
    status: "free",
    guests: 0,
  },
];

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */
type FloorContextValue = {
  tables: FloorTable[];
  addTable: (input: TableInput) => FloorTable;
  updateTable: (id: string, patch: Partial<Omit<FloorTable, "id">>) => void;
  setStatus: (id: string, status: TableStatus) => void;
  removeTable: (id: string) => void;
};

const FloorContext = createContext<FloorContextValue | null>(null);

function newId() {
  return `table-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function FloorProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<FloorTable[]>(seed);

  const addTable = useCallback((input: TableInput) => {
    let created!: FloorTable;
    setTables((prev) => {
      const inZone = prev.filter((t) => t.zone === input.zone).length;
      created = {
        ...input,
        id: newId(),
        // Stagger new tables so they don't stack on top of each other
        x: 20 + ((inZone * 13) % 60),
        y: 25 + ((inZone * 17) % 50),
        status: "free",
        guests: 0,
      };
      return [...prev, created];
    });
    return created;
  }, []);

  const updateTable = useCallback(
    (id: string, patch: Partial<Omit<FloorTable, "id">>) => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          next.guests = Math.min(next.guests, next.seats);
          return next;
        }),
      );
    },
    [],
  );

  const setStatus = useCallback((id: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              guests: status === "occupied" ? Math.max(1, t.guests) : 0,
            }
          : t,
      ),
    );
  }, []);

  const removeTable = useCallback((id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ tables, addTable, updateTable, setStatus, removeTable }),
    [tables, addTable, updateTable, setStatus, removeTable],
  );

  return (
    <FloorContext.Provider value={value}>{children}</FloorContext.Provider>
  );
}

export function useFloor() {
  const ctx = useContext(FloorContext);
  if (!ctx) throw new Error("useFloor must be used inside <FloorProvider>");
  return ctx;
}
