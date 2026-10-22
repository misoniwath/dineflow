/** @jest-environment node */
import { beforeEach, expect, jest, test } from "@jest/globals";
import { GET } from "@/app/api/bills/route";
import { POST } from "@/app/api/bills/payments/route";
import { isAuthenticated } from "@/lib/auth/jwt";
import * as billing from "@/lib/db/billing";

jest.mock("@/lib/auth/jwt", () => ({ isAuthenticated: jest.fn() }));
jest.mock("@/lib/db/index", () => ({ db: {} }));
const record = jest.spyOn(billing, "recordBillPayment");
const list = jest.spyOn(billing, "listBills");
const input = {
  tableNumber: 4,
  orderIds: ["10000000-0000-4000-8000-000000000001"],
  expectedTotalCents: 1001,
  guestCount: 2,
  guestAssignments: {},
};
function request(body: unknown) {
  return new Request("http://localhost/api/bills/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isAuthenticated).mockResolvedValue(true);
  list.mockResolvedValue([]);
});

test("requires authentication for bill reads and payment records", async () => {
  jest.mocked(isAuthenticated).mockResolvedValue(false);
  expect((await GET()).status).toBe(401);
  expect((await POST(request(input))).status).toBe(401);
  expect(list).not.toHaveBeenCalled();
  expect(record).not.toHaveBeenCalled();
});
test("returns the saved bills", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ bills: [] });
});
test.each([
  null,
  { ...input, tableNumber: -1 },
  { ...input, orderIds: [] },
  { ...input, orderIds: [input.orderIds[0], input.orderIds[0]] },
  { ...input, orderIds: ["invalid"] },
  { ...input, expectedTotalCents: 10.1 },
  { ...input, guestCount: 0 },
  { ...input, guestAssignments: { [input.orderIds[0]]: 3 } },
])("rejects invalid payment input %# before writing", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(record).not.toHaveBeenCalled();
});
test("surfaces stale payment conflicts so the cashier can refresh", async () => {
  record.mockRejectedValueOnce(
    new billing.BillingError("The bill total changed", 409),
  );
  const response = await POST(request(input));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    message: "The bill total changed",
  });
});
