/** @jest-environment node */
import { beforeEach, expect, jest, test } from "@jest/globals";
import { cookies } from "next/headers";
import { PATCH } from "@/app/api/orders/[id]/route";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import * as cancellation from "@/lib/db/order-cancellation";

jest.mock("server-only", () => ({}));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth/jwt", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/db/index", () => ({ db: { select: jest.fn(), transaction: jest.fn() } }));
const cancel = jest.spyOn(cancellation, "cancelOrder");
const actorId = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
const account = jest.fn<() => Promise<{ id: string; isActive: boolean }[]>>();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(cookies).mockResolvedValue({ get: () => ({ value: "token" }) } as never);
  jest.mocked(verifyToken).mockResolvedValue({ id: actorId, role: "staff" });
  jest.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit: account }) }) } as never);
  account.mockResolvedValue([{ id: actorId, isActive: true }]);
  cancel.mockReset().mockResolvedValue({ id, status: "cancelled", canCancel: false });
});

function request(body: unknown = { status: "cancelled", reason: "Duplicate order" }) {
  return PATCH(new Request(`http://localhost/api/orders/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
}

test("cancels using the signed-in employee's identity", async () => {
  const result = await request({ status: "cancelled", reason: "Duplicate order", cancelledBy: "forged-user" });
  expect(result.status).toBe(200);
  expect(cancel).toHaveBeenCalledWith(id, actorId, "Duplicate order");
  expect(await result.json()).toEqual({ success: true, order: { id, status: "cancelled", canCancel: false } });
});

test("rejects invalid sessions before cancellation", async () => {
  jest.mocked(verifyToken).mockResolvedValue(null);
  expect((await request()).status).toBe(401);
  expect(cancel).not.toHaveBeenCalled();
});

test.each([{ accounts: [] }, { accounts: [{ id: actorId, isActive: false }] }])(
  "rejects missing and inactive employees", async ({ accounts }) => {
    account.mockResolvedValue(accounts);
    expect((await request()).status).toBe(401);
    expect(cancel).not.toHaveBeenCalled();
  },
);

test.each([400, 404, 409] as const)("returns cancellation validation and conflict errors (%s)", async (status) => {
  cancel.mockRejectedValueOnce(new cancellation.OrderCancellationError("Cancellation rejected", status));
  const result = await request();
  expect(result.status).toBe(status);
  expect(await result.json()).toMatchObject({ success: false, message: "Cancellation rejected" });
});
