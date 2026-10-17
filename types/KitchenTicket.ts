export type KitchenTicketItem = {
  id: string;
  name: string;
  quantity: number;
};

export type KitchenTicket = {
  id: string;
  tableNumber: number;
  station: string;
  createdAt: string;
  status: "pending" | "preparing" | "ready" | "served";
  items: KitchenTicketItem[];
  notes?: string;
};
