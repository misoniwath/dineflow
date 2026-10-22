"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMenuAndOrders,
  createOrder as apiCreateOrder,
  updateOrderStatusApi,
  cancelOrderApi,
} from "@/lib/api/orders";
import type { MenuItem } from "@/types/Menu";
import type { Tickets } from "@/types/Tickets";
import type { KitchenTicket } from "@/types/KitchenTicket";
import type { OrderStatus, SavedOrder } from "@/types/Order";

type OrderContextValue = {
  menu: Record<string, MenuItem[]>;
  itemsById: Record<string, MenuItem>;
  categories: string[];
  kitchenTickets: KitchenTicket[];
  updateKitchenStatus: (id: string, status: OrderStatus) => Promise<void>;
  cancelKitchenOrder: (id: string, reason: string) => Promise<void>;
  tickets: Tickets;
  loading: boolean;
  error: string | null;
  setTickets: React.Dispatch<React.SetStateAction<Tickets>>;
  sendOrderToKitchen: (tableNumber: number) => Promise<void>;
  loadData: () => Promise<void>;
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [tickets, setTickets] = useState<Tickets>({});
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMenuAndOrders();
      setMenuList(data.menu);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  // Group flat menu items by category
  const menu = useMemo(() => {
    return menuList.reduce(
      (acc, item) => {
        const cat = item.category ?? "Starters";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      },
      {} as Record<string, MenuItem[]>,
    );
  }, [menuList]);

  const categories = useMemo(() => Object.keys(menu), [menu]);

  const itemsById = useMemo(() => {
    return Object.fromEntries(menuList.map((item) => [item.id, item]));
  }, [menuList]);

  const kitchenTickets = useMemo<KitchenTicket[]>(() => {
    return orders
      .filter((order) =>
        ["pending", "preparing", "ready"].includes(order.status),
      )
      .map((order) => ({
        id: order.id,
        tableNumber: order.tableNumber,
        status: order.status,
        canCancel: order.canCancel,
        cancellationBlockReason: order.cancellationBlockReason,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: itemsById[item.menuItemId]?.name ?? "Unknown menu item",
          quantity: item.quantity,
        })),
      }));
  }, [orders, itemsById]);

  const updateKitchenStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const updated = await updateOrderStatusApi(id, status);
      setOrders((current) =>
        current.map((order) =>
          order.id === updated.id
            ? { ...order, status: updated.status }
            : order,
        ),
      );
    },
    [],
  );

  const cancelKitchenOrder = useCallback(async (id: string, reason: string) => {
    const updated = await cancelOrderApi(id, reason);
    setOrders((current) => current.map((order) => order.id === updated.id
      ? { ...order, status: updated.status, canCancel: false }
      : order));
  }, []);

  const sendOrderToKitchen = useCallback(
    async (tableNumber: number) => {
      const tableTicket = tickets[tableNumber];
      if (!tableTicket || Object.keys(tableTicket).length === 0) return;

      const items = Object.entries(tableTicket).map(
        ([menuItemId, quantity]) => ({
          menuItemId,
          quantity,
          price: itemsById[menuItemId]?.price ?? 0,
        }),
      );

      await apiCreateOrder({ tableNumber, items });

      setTickets((prev) => ({ ...prev, [tableNumber]: {} }));
      await loadData(); // Refresh orders after sending to kitchen
    },
    [tickets, itemsById, loadData],
  );

  const value = useMemo(
    () => ({
      menu,
      itemsById,
      categories,
      tickets,
      loading,
      error,
      kitchenTickets,
      updateKitchenStatus,
      cancelKitchenOrder,
      setTickets,
      sendOrderToKitchen,
      loadData,
    }),
    [
      menu,
      itemsById,
      categories,
      tickets,
      loading,
      error,
      kitchenTickets,
      updateKitchenStatus,
      cancelKitchenOrder,
      sendOrderToKitchen,
      setTickets,
      loadData,
    ],
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error("useOrder must be used inside <OrderProvider>");
  }
  return ctx;
}
