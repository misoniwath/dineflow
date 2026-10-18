import { MenuItem } from "@/types/Menu";

export async function getMenuItems(): Promise<MenuItem[]> {
  const res = await fetch("/api/menu-items");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch menu items");
  return data.items;
}

export async function saveMenuItem(item: MenuItem): Promise<MenuItem> {
  const res = await fetch("/api/menu-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save menu item");
  return data.item;
}

export async function deleteMenuItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/menu-items?id=${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to delete menu item");
}
