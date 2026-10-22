import type { OrderStatus } from "@/types/Order";

export type KitchenTicketItem = {
  id: string;
  name: string;
  quantity: number;
};

export type KitchenTicket = {
  id: string;
  tableNumber: number;
  station?: string;
  createdAt: string;
  status: OrderStatus;
  canCancel: boolean;
  cancellationBlockReason: string | null;
  items: KitchenTicketItem[];
  notes?: string;
};
