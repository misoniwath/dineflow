export type BillItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  guestNumber: number;
};

export type Bill = {
  id: string;
  orderId: string;
  tableNumber: number;
  guestCount: number;
  status: "unpaid" | "paid";
  items: BillItem[];
};
