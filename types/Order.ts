export type OrderItemInput = {
  menuItemId: string;
  quantity: number;
  price: number;
};

export type CreateOrderInput = {
  tableNumber: number;
  items: OrderItemInput[];
};

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type SavedOrder = {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  createdAt: string;
  canCancel: boolean;
  cancellationBlockReason: string | null;
  items: (OrderItemInput & { id: string })[];
};

export type OrderInventoryDeduction = {
  inventoryItemId: string;
  quantity: number;
};
