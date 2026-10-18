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
import {
  getMenuAndOrders,
  createOrder as apiCreateOrder,
} from "@/lib/api/orders";
import { MenuItem } from "@/types/Menu";
import { Tickets } from "@/types/Tickets";

type OrderContextValue = {
  menu: Record<string, MenuItem[]>;
  itemsById: Record<string, MenuItem>;
  categories: string[];
  tickets: Tickets;
  setTickets: React.Dispatch<React.SetStateAction<Tickets>>;
  sendOrderToKitchen: (tableNumber: number) => Promise<void>;
  isLoading: boolean;
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [tickets, setTickets] = useState<Tickets>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMenuAndOrders()
      .then((data) => {
        setMenuList(data.menu);
      })
      .catch((err) => console.error("Failed to load menu", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Group flat menu items by category
  const menu = useMemo(() => {
    return menuList.reduce(
      (acc, item) => {
        // Assuming category is attached or mapped; default to Starters if missing
        const cat = (item as any).category ?? "Starters";
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
    },
    [tickets, itemsById],
  );

  const value = useMemo(
    () => ({
      menu,
      itemsById,
      categories,
      tickets,
      setTickets,
      sendOrderToKitchen,
      isLoading,
    }),
    [menu, itemsById, categories, tickets, sendOrderToKitchen, isLoading],
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
