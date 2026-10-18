"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FloorTable, TableInput, TableStatus, Zone } from "@/types/Floor";
import {
  getFloorTables,
  addFloorTable,
  updateFloorTable,
  deleteFloorTable,
} from "@/lib/api/floors";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export const STATUS_LABEL: Record<TableStatus, string> = {
  free: "Free",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
};
export const STATUSES = Object.keys(STATUS_LABEL) as TableStatus[];

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */
type FloorContextValue = {
  tables: FloorTable[];
  zones: Zone[];
  loading: boolean;
  saveAllTables: () => Promise<void>;
  addTable: (input: TableInput) => Promise<FloorTable>;
  updateTableLocal: (
    id: string,
    patch: Partial<Omit<FloorTable, "id">>,
  ) => void;
  updateTable: (
    id: string,
    patch: Partial<Omit<FloorTable, "id">>,
  ) => Promise<void>;
  setStatus: (id: string, status: TableStatus) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
  refreshTables: () => Promise<void>;
};

const FloorContext = createContext<FloorContextValue | null>(null);

export function FloorProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>(["Main Hall"]);

  const loadZones = (tables: FloorTable[]) => {
    const uniqueZones = Array.from(new Set(tables.map((t) => t.zone)));
    setZones(uniqueZones as Zone[]);
  };

  const refreshTables = useCallback(async () => {
    try {
      const data = await getFloorTables();
      setTables(data);
      loadZones(data);
    } catch (error) {
      console.error("Failed to load floor tables:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTables();
  }, [refreshTables]);

  const addTable = useCallback(
    async (input: TableInput) => {
      // Calculate layout coordinates locally for immediate use
      const inZone = tables.filter((t) => t.zone === input.zone).length;

      // Temporary optimistic object with a temporary tracking key
      const tempKeyId = `temp-${Date.now()}`;
      const payload = {
        ...input,
        id: tempKeyId,
        x: 20 + ((inZone * 13) % 60),
        y: 25 + ((inZone * 17) % 50),
        status: "free" as TableStatus,
        guests: 0,
      };

      // Optimistic update
      setTables((prev) => [...prev, payload]);

      try {
        // Send payload without temp ID so PostgreSQL/API generates the real ID
        const { id, ...inputWithoutId } = payload;
        const saved = await addFloorTable(inputWithoutId);

        // Replace the temporary item with the database-returned record (containing the real ID)
        setTables((prev) => prev.map((t) => (t.id === tempKeyId ? saved : t)));
        return saved;
      } catch (error) {
        console.error("Failed to add table:", error);
        refreshTables(); // Revert on failure
        throw error;
      }
    },
    [tables, refreshTables],
  );

  // Local-only state change during dragging/editing
  const updateTableLocal = useCallback(
    (id: string, patch: Partial<Omit<FloorTable, "id">>) => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          if (next.guests !== undefined) {
            next.guests = Math.min(next.guests, next.seats);
          }
          return next;
        }),
      );
    },
    [],
  );

  // API-backed update for single property changes (like status sheet clicks)
  const updateTable = useCallback(
    async (id: string, patch: Partial<Omit<FloorTable, "id">>) => {
      updateTableLocal(id, patch);
      try {
        const targetTable = tables.find((t) => t.id === id);
        if (targetTable) {
          await updateFloorTable({ ...targetTable, ...patch });
        }
      } catch (error) {
        console.error("Failed to update table:", error);
        refreshTables();
      }
    },
    [tables, updateTableLocal, refreshTables],
  );

  const saveAllTables = useCallback(async () => {
    try {
      await Promise.all(
        tables.map((t) =>
          updateFloorTable({
            id: t.id,
            number: t.number,
            seats: t.seats,
            shape: t.shape,
            zone: t.zone,
            x: t.x,
            y: t.y,
            status: t.status,
            guests: t.guests,
          }),
        ),
      );
    } catch (error) {
      console.error("Failed to batch save tables:", error);
      refreshTables(); // Revert on failure
    }
  }, [tables, refreshTables]);

  const setStatus = useCallback(
    async (id: string, status: TableStatus) => {
      let targetTable = tables.find((t) => t.id === id);
      if (!targetTable) return;

      const guests =
        status === "occupied" ? Math.max(1, targetTable.guests) : 0;

      // Optimistic update
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, guests } : t)),
      );

      try {
        await updateFloorTable({ id, ...targetTable, status, guests });
      } catch (error) {
        console.error("Failed to update table status:", error);
        refreshTables();
      }
    },
    [tables, refreshTables],
  );

  const removeTable = useCallback(
    async (id: string) => {
      // Optimistic update
      setTables((prev) => prev.filter((t) => t.id !== id));

      try {
        await deleteFloorTable(id);
      } catch (error) {
        console.error("Failed to delete table:", error);
        refreshTables();
      }
    },
    [refreshTables],
  );

  const value = useMemo(
    () => ({
      tables,
      zones,
      loading,
      saveAllTables,
      addTable,
      updateTableLocal,
      updateTable,
      setStatus,
      removeTable,
      refreshTables,
    }),
    [
      tables,
      zones,
      loading,
      saveAllTables,
      addTable,
      updateTableLocal,
      updateTable,
      setStatus,
      removeTable,
      refreshTables,
    ],
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
