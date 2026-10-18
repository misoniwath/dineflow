import { MenuItem } from "@/types/Menu";
import { CreateOrderInput } from "@/types/Order";

export async function getMenuAndOrders() {
  const res = await fetch("/api/orders", { method: "GET" });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message ?? "Failed to fetch catalog and orders");
  return data as { menu: MenuItem[]; orders: any[] };
}

export async function createOrder(input: CreateOrderInput) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to create order");
  return data.order;
}
