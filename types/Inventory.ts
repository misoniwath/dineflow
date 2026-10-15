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

export type FilterOption = {
  value: string;
  label: string;
  count: number;
  dot?: string;
};

export type FormState = {
  name: string;
  unit: string;
  onHand: string;
  par: string;
  lowAt: string;
  expires: string;
  supplierId: string;
};

export type FormErrors = Partial<Record<keyof FormState, string>>;
