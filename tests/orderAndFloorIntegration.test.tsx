import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FloorProvider, useFloor } from "@/stores/FloorStore";
import { OrderProvider, useOrder } from "@/stores/OrderStore";
import * as apiOrders from "@/lib/api/orders";
import * as apiFloors from "@/lib/api/floors";

jest.mock("@/lib/api/orders", () => ({
  getMenuAndOrders: jest.fn(),
  createOrder: jest.fn(),
}));

jest.mock("@/lib/api/floors", () => ({
  getFloorTablesApi: jest.fn(),
}));

const mockedGetMenu = apiOrders.getMenuAndOrders as jest.MockedFunction<
  typeof apiOrders.getMenuAndOrders
>;
const mockedCreateOrder = apiOrders.createOrder as jest.MockedFunction<
  typeof apiOrders.createOrder
>;
const mockedGetTables = apiFloors.getFloorTablesApi as jest.MockedFunction<
  typeof apiFloors.getFloorTablesApi
>;

function POSComponent() {
  const { tables, loadData: loadTables } = useFloor();
  const {
    menu,
    loadData: loadMenuAndOrders,
    tickets,
    setTickets,
    sendOrderToKitchen,
  } = useOrder();

  return (
    <div>
      <button
        onClick={() => {
          loadTables();
          loadMenuAndOrders();
        }}
      >
        Load POS Data
      </button>
      <span data-testid="menu-categories">{Object.keys(menu).join(",")}</span>
      <span data-testid="tables-loaded">{tables.length}</span>

      <button
        onClick={() =>
          setTickets((prev) => ({
            ...prev,
            1: { "item-1": 2 }, // Table 1 orders 2 quantities of item-1
          }))
        }
      >
        Add Item to Table 1
      </button>

      <button onClick={() => sendOrderToKitchen(1)}>
        Send Table 1 to Kitchen
      </button>
      <span data-testid="ticket-status">
        {tickets[1]?.["item-1"] ? `Ordered: ${tickets[1]["item-1"]}` : "Empty"}
      </span>
    </div>
  );
}

describe("Order and Floor Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads POS menu & tables, adds item to ticket, and sends order to kitchen", async () => {
    mockedGetTables.mockResolvedValueOnce([
      {
        id: "t1",
        number: 1,
        seats: 4,
        shape: "square",
        zone: "Main Hall",
        status: "free",
        guests: 0,
        x: 0,
        y: 0,
      },
    ] as any);
    mockedGetMenu.mockResolvedValueOnce({
      menu: [{ id: "item-1", name: "Burger", price: 10, category: "Mains" }],
      orders: [],
    } as any);
    mockedCreateOrder.mockResolvedValueOnce({
      success: true,
      orderId: "ord-99",
    } as any);

    render(
      <FloorProvider>
        <OrderProvider>
          <POSComponent />
        </OrderProvider>
      </FloorProvider>,
    );

    // Load initial data
    fireEvent.click(screen.getByText("Load POS Data"));

    await waitFor(() => {
      expect(screen.getByTestId("tables-loaded")).toHaveTextContent("1");
      expect(screen.getByTestId("menu-categories")).toHaveTextContent("Mains");
    });

    // Add item to ticket
    fireEvent.click(screen.getByText("Add Item to Table 1"));
    expect(screen.getByTestId("ticket-status")).toHaveTextContent("Ordered: 2");

    // Send order to kitchen
    fireEvent.click(screen.getByText("Send Table 1 to Kitchen"));
    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledWith({
        tableNumber: 1,
        items: [{ menuItemId: "item-1", quantity: 2, price: 10 }],
      });
      expect(screen.getByTestId("ticket-status")).toHaveTextContent("Empty");
    });
  });
});
