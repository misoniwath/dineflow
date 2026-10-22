import type { MenuItem } from "@/types/Menu";
import type { CreateOrderInput, OrderStatus, SavedOrder } from "@/types/Order";

function mapApiMenu(menu: MenuItem): MenuItem {
  return {
    ...menu,
    name: typeof menu.name === "string" ? menu.name.trim() : menu.name,
    category:
      typeof menu.category === "string"
        ? (menu.category.trim() as MenuItem["category"])
        : "Starters",
  };
}

function mapApiOrder(order: SavedOrder): SavedOrder {
  return {
    ...order,
  };
}

function mapApiMenuAndOrders(data: { menu: MenuItem[]; orders: SavedOrder[] }) {
  return {
    menu: data.menu.map(mapApiMenu),
    orders: data.orders.map(mapApiOrder),
  };
}

export async function getMenuAndOrders() {
  const res = await fetch("/api/orders", { method: "GET" });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message ?? "Failed to fetch catalog and orders");
  return mapApiMenuAndOrders(data);
}

export async function createOrder(input: CreateOrderInput) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to create order");
  return data;
}

export async function updateOrderStatusApi(
  id: string,
  status: OrderStatus,
): Promise<Pick<SavedOrder, "id" | "status">> {
  const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Failed to update order status");
  }

  return data.order;
}

export async function cancelOrderApi(id: string, reason: string) {
  const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled", reason }),
  });
  if (response.redirected || response.status === 401) {
    throw new Error("Please sign in again to cancel this order.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Could not cancel order.");
  if (data?.order?.id !== id || data.order.status !== "cancelled") {
    throw new Error("Could not confirm cancellation. Refresh Kitchen before trying again.");
  }
  return data.order as Pick<SavedOrder, "id" | "status">;
}
