import { InventoryItem, ItemInput } from "@/types/Inventory";

function mapApiInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    name: typeof item.name === "string" ? item.name.trim() : item.name,
    unit: typeof item.unit === "string" ? item.unit.trim() : item.unit,
  };
}

export async function getInventoryItemsApi() {
  const res = await fetch("/api/inventory-items");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch inventory");
  return data.items.map(mapApiInventoryItem);
}

export async function saveInventoryItemApi(input: ItemInput & { id?: string }) {
  const res = await fetch("/api/inventory-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save inventory item");
  return mapApiInventoryItem(data.item);
}

export async function deleteInventoryItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/inventory-items?id=${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message ?? "Failed to delete inventory item");
}
