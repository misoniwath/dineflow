import "@testing-library/jest-dom/jest-globals";
import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import BillingView from "@/views/BillingView";
import type { Bill } from "@/types/Bill";

jest.mock("@/components/ui/button", () => ({
  Button: ({
    variant,
    ...props
  }: ComponentProps<"button"> & { variant?: string }) => {
    void variant;
    return <button {...props} />;
  },
}));
jest.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
  money: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
}));

const orderIds = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
];
const openBill: Bill = {
  id: "table-4",
  orderIds,
  tableNumber: 4,
  status: "unpaid",
  guestCount: 2,
  totalCents: 3003,
  createdAt: "2026-10-22T00:00:00.000Z",
  paidAt: null,
  items: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Dinner special",
      quantity: 3,
      unitPriceCents: 1001,
      guestNumber: null,
    },
  ],
};
const mockFetch = jest.fn<typeof fetch>();
function response(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response;
}
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

test("loads combined bills, splits cents exactly, and persists the paid receipt through refresh", async () => {
  let saved: Bill[] = [openBill];
  mockFetch.mockImplementation(async (_url, init) => {
    if (init?.method === "POST") {
      saved = [
        {
          ...openBill,
          id: "receipt-1",
          status: "paid",
          paidAt: "2026-10-22T01:00:00.000Z",
        },
      ];
      return response({ bill: saved[0] });
    }
    return response({ bills: saved });
  });
  render(<BillingView />);
  await screen.findByRole("button", { name: "Table 4 bill" });
  expect(screen.getByText("2 orders · 3 items")).toBeInTheDocument();
  expect(screen.getByText("$15.02")).toBeInTheDocument();
  expect(screen.getByText("$15.01")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
  await screen.findByText("Full payment recorded.");
  const [, init] = mockFetch.mock.calls.find(
    ([, value]) => value?.method === "POST",
  )!;
  expect(JSON.parse(String(init?.body))).toMatchObject({
    tableNumber: 4,
    orderIds,
    expectedTotalCents: 3003,
    guestCount: 2,
  });
  expect(screen.getByRole("button", { name: "Paid" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Refresh bills" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Refresh bills" })).toBeEnabled(),
  );
  expect(screen.getByText("Full payment recorded.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Unpaid bills (0)" }));
  expect(screen.getByText("No unpaid bills available")).toBeInTheDocument();
});

test("blocks repeat clicks while saving and keeps a rejected bill unpaid", async () => {
  mockFetch.mockResolvedValue(response({ bills: [openBill] }));
  render(<BillingView />);
  const pay = await screen.findByRole("button", { name: "Mark as paid" });
  let finish!: (value: Response) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(pay);
  expect(pay).toBeDisabled();
  expect(screen.getByRole("button", { name: "Refresh bills" })).toBeDisabled();
  await act(async () =>
    finish(
      response(
        {
          message:
            "This table's orders changed. Refresh the bill and try again.",
        },
        false,
      ),
    ),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("orders changed");
  expect(screen.getByRole("button", { name: "Mark as paid" })).toBeEnabled();
  expect(screen.getByText("Unpaid", { exact: true })).toBeInTheDocument();
});

test("shows empty and failed loads without displaying sample bills", async () => {
  mockFetch.mockResolvedValueOnce(
    response({ message: "Billing unavailable" }, false),
  );
  mockFetch.mockResolvedValue(response({ bills: [] }));
  render(<BillingView />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Billing unavailable",
  );
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh bills" }));
  await screen.findByText("No unpaid bills available");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("lets staff assign lines to guests before previewing a guest split", async () => {
  mockFetch.mockResolvedValue(response({ bills: [openBill] }));
  render(<BillingView />);
  fireEvent.click(await screen.findByRole("button", { name: "By guest" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Assign");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Guest 2" })).toHaveTextContent(
    "$30.03",
  );
});
