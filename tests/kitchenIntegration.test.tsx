import "@testing-library/jest-dom/jest-globals";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { OrderProvider } from "@/stores/OrderStore";
import KitchenView from "@/views/KitchenView";
import type { SavedOrder } from "@/types/Order";

jest.mock("@/components/ui/button", () => ({
  Button: ({
    variant,
    ...props
  }: ComponentProps<"button"> & { variant?: string }) => {
    void variant;
    return <button {...props} />;
  },
}));
jest.mock("cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
jest.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

const mockFetch = jest.fn<typeof fetch>();
const orderId = "c1b4d5e6-7890-4123-8123-123456789abc";
let savedOrders: SavedOrder[];

function response(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response;
}

function makeOrder(status: SavedOrder["status"], tableNumber = 12): SavedOrder {
  return {
    id: tableNumber === 12 ? orderId : `order-${tableNumber}`,
    tableNumber,
    status,
    createdAt: new Date().toISOString(),
    canCancel: status === "pending",
    cancellationBlockReason: null,
    items: [
      { id: `item-${tableNumber}`, menuItemId: "menu-1", quantity: 2, price: 1000 },
    ],
  };
}

function renderKitchen() {
  return render(
    <OrderProvider>
      <KitchenView />
    </OrderProvider>,
  );
}

beforeEach(() => {
  savedOrders = [];
  mockFetch.mockReset();
  global.fetch = mockFetch;
  mockFetch.mockImplementation(async (input, init) => {
    if (init?.method === "PATCH") {
      const { status } = JSON.parse(String(init.body)) as Pick<
        SavedOrder,
        "status"
      >;
      const order = savedOrders.find((item) => String(input).endsWith(item.id));
      if (!order) throw new Error("Unexpected order ID");
      order.status = status;
      order.canCancel = false;
      return response({ order: { id: order.id, status } });
    }
    return response({
      menu: [
        { id: "menu-1", name: "Dinner special", price: 1000, category: "Mains" },
      ],
      orders: savedOrders.map((order) => ({ ...order })),
    });
  });
});

test("requires confirmation and a reason before cancelling a placed order", async () => {
  savedOrders = [makeOrder("pending")];
  renderKitchen();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel order for table 12" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("2× Dinner special")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm cancellation" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Enter a cancellation reason");
  expect(mockFetch.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  fireEvent.change(within(dialog).getByLabelText("Cancellation reason"), { target: { value: "  Duplicate order  " } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm cancellation" }));
  await screen.findByText("Order for table 12 cancelled.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(mockFetch.mock.calls.find(([, init]) => init?.method === "PATCH")?.[1]?.body)
    .toBe(JSON.stringify({ status: "cancelled", reason: "Duplicate order" }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh orders" }));
  await screen.findByText("No placed tickets");
});

test("keeping the order closes confirmation without sending a cancellation", async () => {
  savedOrders = [makeOrder("pending")];
  renderKitchen();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel order for table 12" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Keep order" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("Table 12")).toBeInTheDocument();
  expect(mockFetch.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
});

test("blocks duplicate cancellation submissions and keeps the form open on failure", async () => {
  savedOrders = [makeOrder("pending")];
  renderKitchen();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel order for table 12" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Cancellation reason"), { target: { value: "Customer cancelled" } });
  let finish!: (value: Response) => void;
  mockFetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm cancellation" }));
  expect(within(dialog).getByRole("button", { name: "Cancelling…" })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Keep order" })).toBeDisabled();
  expect(within(dialog).getByLabelText("Cancellation reason")).toBeDisabled();
  fireEvent.submit(dialog.querySelector("form")!);
  expect(mockFetch.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  await act(async () => finish(response({ message: "Only placed orders can be cancelled. Refresh Kitchen." }, false)));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Only placed orders");
  expect(within(dialog).getByLabelText("Cancellation reason")).toHaveValue("Customer cancelled");
  expect(within(dialog).getByRole("button", { name: "Confirm cancellation" })).toBeEnabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Keep order" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("article")).toBeInTheDocument();
});

test("explains cancellation blockers and offers no cancellation for preparation or ready tickets", async () => {
  savedOrders = [
    { ...makeOrder("pending"), canCancel: false, cancellationBlockReason: "Paid orders require a payment reversal." },
    { ...makeOrder("pending", 13), canCancel: false, cancellationBlockReason: "This older order needs a stock review before it can be cancelled." },
    makeOrder("preparing", 14), makeOrder("ready", 15),
  ];
  renderKitchen();
  expect(await screen.findByRole("button", { name: "Cancel order for table 12" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel order for table 13" })).toBeDisabled();
  expect(screen.getByText("Paid orders require a payment reversal.")).toBeInTheDocument();
  expect(screen.getByText(/older order needs a stock review/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel order for table 14" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel order for table 15" })).not.toBeInTheDocument();
});

describe("Kitchen with saved orders", () => {
  test("starts empty and loads only active saved tickets", async () => {
    renderKitchen();
    await screen.findByText("No placed tickets");
    expect(screen.getByText("0 open")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    savedOrders = [
      makeOrder("pending"),
      makeOrder("preparing", 13),
      makeOrder("ready", 14),
      makeOrder("completed", 15),
      makeOrder("cancelled", 16),
    ];
    fireEvent.click(screen.getByRole("button", { name: "Refresh orders" }));
    await screen.findByText("3 open");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getAllByText("2× Dinner special")).toHaveLength(3);
    expect(screen.queryByText("Table 15")).not.toBeInTheDocument();
    expect(screen.queryByText("Table 16")).not.toBeInTheDocument();
  });

  test("saves each button transition and keeps its status after reloading", async () => {
    savedOrders = [makeOrder("pending")];
    renderKitchen();
    fireEvent.click(
      await screen.findByRole("button", { name: "Start preparing for table 12" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark ready for table 12" }),
    );

    await screen.findByRole("button", { name: "Mark served for table 12" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh orders" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Mark served for table 12" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark served for table 12" }));
    await screen.findByText("0 open");

    const patches = mockFetch.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(
      patches.map(([url, init]) => [url, JSON.parse(String(init?.body))]),
    ).toEqual([
      [`/api/orders/${orderId}`, { status: "preparing" }],
      [`/api/orders/${orderId}`, { status: "ready" }],
      [`/api/orders/${orderId}`, { status: "completed" }],
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Refresh orders" }));
    await screen.findByText("No placed tickets");
    expect(screen.queryByText("Table 12")).not.toBeInTheDocument();
  });

  test("disables actions while saving and preserves the ticket when a save fails", async () => {
    savedOrders = [makeOrder("pending")];
    renderKitchen();
    const button = await screen.findByRole("button", {
      name: "Start preparing for table 12",
    });
    let finishSave!: (value: Response) => void;
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => { finishSave = resolve; }),
    );
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh orders" })).toBeDisabled();

    await act(async () => {
      finishSave(
        response(
          { message: "Order status changed. Refresh and try again." },
          false,
        ),
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Order status changed");
    expect(
      within(screen.getByRole("region", { name: "Placed 1" })).getByText(
        "Table 12",
      ),
    ).toBeInTheDocument();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await screen.findByRole("button", { name: "Mark ready for table 12" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows load failures and lets the user retry", async () => {
    mockFetch.mockResolvedValueOnce(
      response({ message: "Could not fetch orders" }, false),
    );
    renderKitchen();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not fetch orders",
    );
    expect(screen.queryByText("No placed tickets")).not.toBeInTheDocument();
    savedOrders = [makeOrder("pending")];
    fireEvent.click(screen.getByRole("button", { name: "Refresh orders" }));
    await screen.findByText("Table 12");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
