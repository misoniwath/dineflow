export type OrderItemInput = {
  menuItemId: string;
  quantity: number;
  price: number;
};

export type CreateOrderInput = {
  tableNumber: number;
  items: OrderItemInput[];
};
