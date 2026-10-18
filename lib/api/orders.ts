import { MenuItem } from "@/types/Menu";
import { CreateOrderInput } from "@/types/Order";

function mapApiMenu(menu: MenuItem): MenuItem {
  return {
    ...menu,
    name: typeof menu.name === "string" ? menu.name.trim() : menu.name,
    category:
      typeof (menu as any).category === "string"
        ? (menu as any).category.trim()
        : ((menu as any).category ?? "Starters"),
  };
}

function mapApiOrder(order: any): any {
  return {
    ...order,
  };
}

function mapApiMenuAndOrders(data: any): { menu: MenuItem[]; orders: any[] } {
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
  return mapApiOrder(data);
}
