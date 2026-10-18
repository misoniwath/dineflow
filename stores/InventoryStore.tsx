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
import { InventoryItem, ItemInput, StockStatus } from "@/types/Inventory";
import { Supplier } from "@/types/Supplier";
import { MenuItem } from "@/types/Menu";
import {
  getInventoryItems,
  saveInventoryItem,
  deleteInventoryItem,
} from "@/lib/api/inventory";
import { getMenuItems, saveMenuItem, deleteMenuItemApi } from "@/lib/api/menu";
import {
  getSuppliers,
  saveSupplier,
  deleteSupplier,
} from "@/lib/api/suppliers";

export const UNITS = [
  "pc",
  "lb",
  "kg",
  "oz",
  "l",
  "btl",
  "keg",
  "case",
] as const;

export const STATUS_LABEL: Record<StockStatus, string> = {
  "at-par": "At par",
  low: "Low",
  out: "Out of stock",
};

export function getStatus(item: InventoryItem): StockStatus {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= item.lowAt) return "low";
  return "at-par";
}

type InventoryContextValue = {
  items: InventoryItem[];
  suppliers: Supplier[];
  menuItems: MenuItem[];
  isLoading: boolean;
  addItem: (input: ItemInput) => Promise<void>;
  updateItem: (id: string, input: ItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, "id">) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (id: string, item: MenuItem) => Promise<void>;
  removeMenuItem: (id: string) => Promise<void>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getInventoryItems(), getMenuItems(), getSuppliers()])
      .then(([invData, menuData, supplierData]) => {
        setItems(invData);
        setMenuItems(menuData);
        setSuppliers(supplierData);
      })
      .catch((err) =>
        console.error("Failed to load inventory, menu, or supplier data", err),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const addItem = useCallback(async (input: ItemInput) => {
    const newItem = await saveInventoryItem(input);
    setItems((prev) => [...prev, newItem]);
  }, []);

  const updateItem = useCallback(async (id: string, input: ItemInput) => {
    const updated = await saveInventoryItem({ ...input, id });
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await deleteInventoryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addSupplier = useCallback(
    async (supplierData: Omit<Supplier, "id">) => {
      const saved = await saveSupplier(supplierData);
      setSuppliers((prev) => [...prev, saved]);
    },
    [],
  );

  const updateSupplier = useCallback(
    async (id: string, supplierData: Partial<Supplier>) => {
      const saved = await saveSupplier({ ...supplierData, id });
      setSuppliers((prev) => prev.map((s) => (s.id === id ? saved : s)));
    },
    [],
  );

  const removeSupplier = useCallback(async (id: string) => {
    await deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addMenuItem = useCallback(async (item: MenuItem) => {
    const saved = await saveMenuItem(item);
    setMenuItems((prev) => [...prev, saved]);
  }, []);

  const updateMenuItem = useCallback(async (id: string, item: MenuItem) => {
    const saved = await saveMenuItem({ ...item, id });
    setMenuItems((prev) => prev.map((m) => (m.id === id ? saved : m)));
  }, []);

  const removeMenuItem = useCallback(async (id: string) => {
    await deleteMenuItemApi(id);
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      items,
      suppliers,
      menuItems,
      isLoading,
      addItem,
      updateItem,
      removeItem,
      addSupplier,
      updateSupplier,
      removeSupplier,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,
    }),
    [
      items,
      suppliers,
      menuItems,
      isLoading,
      addItem,
      updateItem,
      removeItem,
      addSupplier,
      updateSupplier,
      removeSupplier,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,
    ],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx)
    throw new Error("useInventory must be used inside <InventoryProvider>");
  return ctx;
}
