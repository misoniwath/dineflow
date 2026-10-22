import "@testing-library/jest-dom/jest-globals";
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { OrderProvider, useOrder } from "@/stores/OrderStore";
import HomeView from "@/views/HomeView";
import type { SavedOrder } from "@/types/Order";

jest.mock("cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
jest.mock("@/hooks/useGreeting", () => ({ useGreeting: () => ({ greeting: "Welcome back", date: "October 22" }) }));
jest.mock("@/stores/FloorStore", () => ({ useFloor: () => ({
  tables: [{ id: "table-1", number: 1, status: "free" }], loading: false, loadData: mockLoadFloor,
}) }));
jest.mock("@/stores/ReservationStore", () => ({
  todayISO: () => "2026-10-22",
  useReservations: () => ({ reservations: [], loading: false, loadData: mockLoadReservations }),
}));
jest.mock("@/stores/InventoryStore", () => ({ useInventory: () => ({
  items: [], loading: false, loadData: mockLoadInventory,
}) }));

const mockLoadFloor = jest.fn();
const mockLoadReservations = jest.fn();
const mockLoadInventory = jest.fn();
const mockFetch = jest.fn<typeof fetch>();
let savedOrders: SavedOrder[];

function makeOrder(status: SavedOrder["status"], tableNumber = 11): SavedOrder {
  return {
    id: `order-${tableNumber}`, tableNumber, status,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    canCancel: status === "pending", cancellationBlockReason: null,
    items: [
      { id: `item-${tableNumber}`, menuItemId: "dinner", quantity: 2, price: 1000 },
      { id: `water-${tableNumber}`, menuItemId: "water", quantity: 1, price: 200 },
    ],
  };
}
function response(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response;
}
function KitchenActions() {
  const { updateKitchenStatus, cancelKitchenOrder } = useOrder();
  return <>
    <button onClick={() => void updateKitchenStatus("order-11", "preparing")}>Prepare first order</button>
    <button onClick={() => void updateKitchenStatus("order-11", "ready")}>Ready first order</button>
    <button onClick={() => void updateKitchenStatus("order-11", "completed")}>Serve first order</button>
    <button onClick={() => void cancelKitchenOrder("order-11", "Duplicate order")}>Cancel first order</button>
  </>;
}
function renderHome(withActions = false) {
  return render(<OrderProvider>{withActions && <KitchenActions />}<HomeView /></OrderProvider>);
}
function queue() {
  return screen.getByRole("region", { name: "Kitchen queue" });
}
function openOrdersCard() {
  return screen.getByText("Open orders").closest('[data-slot="card"]') as HTMLElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  savedOrders = [];
  global.fetch = mockFetch;
  mockFetch.mockImplementation(async (input, init) => {
    if (init?.method === "PATCH") {
      const { status } = JSON.parse(String(init.body)) as Pick<SavedOrder, "status">;
      const order = savedOrders.find((item) => String(input).endsWith(item.id));
      if (!order) throw new Error("Unexpected order ID");
      order.status = status;
      return response({ order: { id: order.id, status } });
    }
    return response({
      menu: [
        { id: "dinner", name: "Dinner special", price: 1000, category: "Mains" },
        { id: "water", name: "Water", price: 200, category: "Beverages" },
      ],
      orders: savedOrders.map((order) => ({ ...order })),
    });
  });
});

test("loads actual tickets into Placed, Preparing, and Ready, with correct counts and item summaries", async () => {
  savedOrders = [makeOrder("pending"), makeOrder("preparing", 12), makeOrder("ready", 13), makeOrder("completed", 14), makeOrder("cancelled", 15)];
  renderHome();
  const region = await screen.findByRole("region", { name: "Kitchen queue" });
  expect(within(openOrdersCard()).getByText("3")).toBeInTheDocument();
  expect(within(region).getByRole("tab", { name: "Placed 1" })).toHaveAttribute("aria-selected", "true");
  expect(within(region).getByText("Table 11")).toBeInTheDocument();
  expect(within(region).getByText("2× Dinner special, 1× Water")).toBeInTheDocument();
  expect(within(region).queryByText("Table 14")).not.toBeInTheDocument();
  expect(within(region).queryByText("Table 15")).not.toBeInTheDocument();
  fireEvent.click(within(region).getByRole("tab", { name: "Preparing 1" }));
  expect(await within(region).findByText("Table 12")).toBeInTheDocument();
  fireEvent.click(within(region).getByRole("tab", { name: "Ready 1" }));
  expect(await within(region).findByText("Table 13")).toBeInTheDocument();
  expect(within(region).getByText("Open display").closest("a")).toHaveAttribute("href", "/kitchen");
});

test("reflects shared store status changes and removes served orders", async () => {
  savedOrders = [makeOrder("pending")];
  renderHome(true);
  await screen.findByRole("tab", { name: "Placed 1" });
  fireEvent.click(screen.getByRole("button", { name: "Prepare first order" }));
  await screen.findByRole("tab", { name: "Preparing 1" });
  expect(screen.getByRole("tab", { name: "Placed 0" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Preparing 1" }));
  expect(await within(queue()).findByText("Table 11")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ready first order" }));
  fireEvent.click(await screen.findByRole("tab", { name: "Ready 1" }));
  expect(await within(queue()).findByText("Table 11")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Serve first order" }));
  await screen.findByRole("tab", { name: "Ready 0" });
  expect(within(queue()).queryByText("Table 11")).not.toBeInTheDocument();
  expect(within(openOrdersCard()).getByText("0")).toBeInTheDocument();
});

test("removes cancelled tickets and updates the open-order count", async () => {
  savedOrders = [makeOrder("pending"), makeOrder("pending", 12)];
  renderHome(true);
  await screen.findByRole("tab", { name: "Placed 2" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel first order" }));
  await screen.findByRole("tab", { name: "Placed 1" });
  expect(within(queue()).queryByText("Table 11")).not.toBeInTheDocument();
  expect(within(queue()).getByText("Table 12")).toBeInTheDocument();
  expect(within(openOrdersCard()).getByText("1")).toBeInTheDocument();
});

test("refresh loads tickets and status changes made in another session", async () => {
  savedOrders = [makeOrder("preparing", 12)];
  renderHome();
  await screen.findByRole("tab", { name: "Preparing 1" });
  savedOrders = [makeOrder("pending"), makeOrder("ready", 12)];
  fireEvent.click(within(queue()).getByRole("button", { name: "Refresh queue" }));
  await screen.findByRole("tab", { name: "Placed 1" });
  expect(within(queue()).getByText("Table 11")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Preparing 0" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Ready 1" })).toBeInTheDocument();
  expect(within(openOrdersCard()).getByText("2")).toBeInTheDocument();
});

test("shows a load error rather than an empty queue, and refresh retries", async () => {
  mockFetch.mockResolvedValueOnce(response({ message: "Could not load saved orders" }, false));
  renderHome();
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load saved orders");
  expect(within(openOrdersCard()).getByText("—")).toBeInTheDocument();
  expect(screen.queryByText("No placed orders.")).not.toBeInTheDocument();
  savedOrders = [makeOrder("pending")];
  fireEvent.click(within(queue()).getByRole("button", { name: "Refresh queue" }));
  await screen.findByRole("tab", { name: "Placed 1" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(within(queue()).getByText("Table 11")).toBeInTheDocument();
});

test("shows true empty states when all saved orders are completed or cancelled", async () => {
  savedOrders = [makeOrder("completed"), makeOrder("cancelled", 12)];
  renderHome();
  await screen.findByText("No placed orders.");
  expect(within(openOrdersCard()).getByText("0")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Preparing 0" }));
  expect(await screen.findByText("No orders being prepared.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Ready 0" }));
  expect(await screen.findByText("No orders waiting to be served.")).toBeInTheDocument();
});
