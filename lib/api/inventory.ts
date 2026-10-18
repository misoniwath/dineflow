import { InventoryItem, ItemInput } from "@/types/Inventory";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const res = await fetch("/api/inventory-items");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch inventory");
  return data.items;
}

export async function saveInventoryItem(
  input: ItemInput & { id?: string },
): Promise<InventoryItem> {
  const res = await fetch("/api/inventory-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save inventory item");
  return data.item;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const res = await fetch(`/api/inventory-items?id=${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message ?? "Failed to delete inventory item");
}
