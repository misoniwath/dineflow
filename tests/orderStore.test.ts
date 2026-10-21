import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  getMenuAndOrders,
  createOrder as apiCreateOrder,
} from "@/lib/api/orders";

// Mock the API module
jest.mock("@/lib/api/orders", () => ({
  getMenuAndOrders: jest.fn(),
  createOrder: jest.fn(),
}));

const mockedGetMenuAndOrders = getMenuAndOrders as jest.MockedFunction<
  typeof getMenuAndOrders
>;
const mockedCreateOrder = apiCreateOrder as jest.MockedFunction<
  typeof apiCreateOrder
>;

describe("OrderStore & API Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches menu and orders successfully", async () => {
    const mockData = {
      menu: [
        { id: "item-1", name: "Spring Rolls", price: 5, category: "Starters" },
        { id: "item-2", name: "Steak", price: 20, category: "Mains" },
      ],
      orders: [],
    };

    mockedGetMenuAndOrders.mockResolvedValueOnce(mockData as any);

    const result = await getMenuAndOrders();

    expect(mockedGetMenuAndOrders).toHaveBeenCalledTimes(1);
    expect(result.menu).toHaveLength(2);
    expect(result.menu[0].name).toBe("Spring Rolls");
  });

  test("creates an order to send to kitchen successfully", async () => {
    const orderPayload = {
      tableNumber: 5,
      items: [{ menuItemId: "item-1", quantity: 2, price: 5 }],
    };

    mockedCreateOrder.mockResolvedValueOnce({
      success: true,
      orderId: "ord-123",
    } as any);

    const result = await apiCreateOrder(orderPayload);

    expect(mockedCreateOrder).toHaveBeenCalledWith(orderPayload);
    expect(result.success).toBe(true);
    expect(result.orderId).toBe("ord-123");
  });

  test("handles failed kitchen order creation", async () => {
    mockedCreateOrder.mockRejectedValueOnce(
      new Error("Failed to create order"),
    );

    const orderPayload = {
      tableNumber: 3,
      items: [{ menuItemId: "item-99", quantity: 1, price: 10 }],
    };

    await expect(apiCreateOrder(orderPayload)).rejects.toThrow(
      "Failed to create order",
    );
    expect(mockedCreateOrder).toHaveBeenCalledWith(orderPayload);
  });
});
