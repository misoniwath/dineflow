/** @jest-environment node */
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { PATCH } from "@/app/api/orders/[id]/route";
import { OrderAccessError, requireOrderStaff } from "@/lib/auth/orders";
import { db } from "@/lib/db/index";
import type { SavedOrder } from "@/types/Order";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/auth/orders", () => ({
  requireOrderStaff: jest.fn(),
  OrderAccessError: class extends Error { readonly status = 401; },
}));
jest.mock("@/lib/db/index", () => ({
  db: { update: jest.fn(), select: jest.fn() },
}));

const id = "c1b4d5e6-7890-4123-8123-123456789abc";
const returning = jest.fn<() => Promise<Pick<SavedOrder, "id" | "status">[]>>();
const where = jest.fn<(condition: SQL) => { returning: typeof returning }>();
const set = jest.fn<
  (values: Pick<SavedOrder, "status">) => { where: typeof where }
>();
const limit = jest.fn<() => Promise<{ id: string }[]>>();

function update(status: unknown, orderId = id) {
  return PATCH(
    new Request(`http://localhost/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id: orderId }) },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireOrderStaff).mockResolvedValue({ id, isActive: true });
  jest.mocked(db.update).mockReturnValue({ set } as never);
  set.mockReturnValue({ where });
  where.mockReturnValue({ returning });
  returning.mockResolvedValue([]);
  jest.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => ({ limit }) }),
  } as never);
  limit.mockResolvedValue([]);
});

describe("Kitchen order status endpoint", () => {
  test.each([
    ["preparing", "pending"],
    ["ready", "preparing"],
    ["completed", "ready"],
  ] as const)("saves %s only from %s", async (status, previous) => {
    returning.mockResolvedValue([{ id, status }]);
    const result = await update(status);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ success: true, order: { id, status } });
    expect(set).toHaveBeenCalledWith({ status });
    // The SQL must match both this order ID and the expected previous status.
    expect(new PgDialect().sqlToQuery(where.mock.calls[0][0]).params).toEqual([
      id,
      previous,
    ]);
  });

  test("requires authentication before touching orders", async () => {
    jest.mocked(requireOrderStaff).mockRejectedValueOnce(new OrderAccessError("Unauthorized"));
    expect((await update("preparing")).status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  test.each(["prepared", "served", "pending", null])(
    "rejects unsupported status %s",
    async (status) => {
      expect((await update(status)).status).toBe(400);
      expect(db.update).not.toHaveBeenCalled();
    },
  );

  test("rejects invalid order IDs", async () => {
    expect((await update("preparing", "ticket-1")).status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  test("returns 404 for missing orders and 409 for a stale transition", async () => {
    expect((await update("ready")).status).toBe(404);
    limit.mockResolvedValue([{ id }]);
    const result = await update("ready");
    expect(result.status).toBe(409);
    expect(await result.json()).toMatchObject({
      message: "Order status changed. Refresh and try again.",
    });
  });
});
