"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export const UNITS = ["pc", "lb", "kg", "oz", "l", "btl", "keg", "case"] as const;

export type Supplier = { id: string; name: string };

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  onHand: number;
  par: number;
  lowAt: number;
  /** ISO date (YYYY-MM-DD) or null when the item doesn't expire */
  expires: string | null;
  supplierId: string;
};

export type ItemInput = Omit<InventoryItem, "id">;

export type StockStatus = "at-par" | "low" | "out";

export const STATUS_LABEL: Record<StockStatus, string> = {
  "at-par": "At par",
  low: "Low",
  out: "Out of stock",
};

/** Status is derived from the numbers, so it never goes out of sync. */
export function getStatus(item: InventoryItem): StockStatus {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= item.lowAt) return "low";
  return "at-par";
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const seedSuppliers: Supplier[] = [
  { id: "bellwood", name: "Bellwood Distributors" },
  { id: "coastal", name: "Coastal Seafood Co." },
  { id: "green", name: "Green Valley Farms" },
  { id: "milano", name: "Milano Dry Goods" },
  { id: "riverside", name: "Riverside Meats" },
];

const seedItems: InventoryItem[] = [
  { id: "i1", name: "Arborio rice", unit: "lb", onHand: 22, par: 25, lowAt: 8, expires: "2027-03-02", supplierId: "milano" },
  { id: "i2", name: "Burrata", unit: "pc", onHand: 14, par: 20, lowAt: 6, expires: "2026-10-22", supplierId: "green" },
  { id: "i3", name: "Chicken breast", unit: "lb", onHand: 0, par: 35, lowAt: 10, expires: null, supplierId: "riverside" },
  { id: "i4", name: "Dried pappardelle", unit: "lb", onHand: 14, par: 20, lowAt: 6, expires: "2027-05-18", supplierId: "milano" },
  { id: "i5", name: "Heirloom tomato", unit: "lb", onHand: 6, par: 30, lowAt: 10, expires: "2026-10-18", supplierId: "green" },
  { id: "i6", name: "House red wine", unit: "btl", onHand: 18, par: 24, lowAt: 6, expires: null, supplierId: "bellwood" },
  { id: "i7", name: "IPA keg", unit: "keg", onHand: 1, par: 4, lowAt: 2, expires: "2026-11-20", supplierId: "bellwood" },
  { id: "i8", name: "Parmigiano", unit: "lb", onHand: 9, par: 10, lowAt: 3, expires: "2027-01-08", supplierId: "milano" },
  { id: "i9", name: "Salmon fillet", unit: "pc", onHand: 34, par: 50, lowAt: 15, expires: "2026-10-17", supplierId: "coastal" },
  { id: "i10", name: "Shishito peppers", unit: "lb", onHand: 11, par: 15, lowAt: 4, expires: "2026-10-19", supplierId: "green" },
];

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type InventoryContextValue = {
  items: InventoryItem[];
  suppliers: Supplier[];
  addItem: (input: ItemInput) => InventoryItem;
  updateItem: (id: string, input: ItemInput) => void;
  removeItem: (id: string) => void;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

function newId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(seedItems);
  const [suppliers] = useState<Supplier[]>(seedSuppliers);

  const addItem = useCallback((input: ItemInput) => {
    const item = { ...input, id: newId() };
    setItems((prev) => [...prev, item]);
    return item;
  }, []);

  const updateItem = useCallback((id: string, input: ItemInput) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...input, id } : i)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const value = useMemo(
    () => ({ items, suppliers, addItem, updateItem, removeItem }),
    [items, suppliers, addItem, updateItem, removeItem],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used inside <InventoryProvider>");
  }
  return ctx;
}
