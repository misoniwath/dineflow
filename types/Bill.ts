export type BillItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  guestNumber: number | null;
};

export type Bill = {
  id: string;
  orderIds: string[];
  tableNumber: number;
  guestCount: number;
  status: "unpaid" | "paid";
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
  items: BillItem[];
};

export type RecordBillPaymentInput = {
  tableNumber: number;
  orderIds: string[];
  expectedTotalCents: number;
  guestCount: number;
  guestAssignments: Record<string, number | null>;
};
