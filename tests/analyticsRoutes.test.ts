/** @jest-environment node */
import { beforeEach, expect, jest, test } from "@jest/globals";
import { cookies } from "next/headers";
import { GET } from "@/app/api/analytics/route";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import * as analytics from "@/lib/db/analytics";
import { createPaidAnalyticsReport } from "@/lib/analytics";

jest.mock("server-only", () => ({}));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth/jwt", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/db/index", () => ({ db: { select: jest.fn() } }));
const load = jest.spyOn(analytics, "getSavedAnalytics");
const actorId = "10000000-0000-4000-8000-000000000001";
const account = jest.fn<() => Promise<{ id: string; role: "staff" | "manager" | "owner"; isActive: boolean }[]>>();
const dates = { startDate: "2026-10-22", endDate: "2026-10-22" };
const before = { startDate: "2026-10-21", endDate: "2026-10-21" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(cookies).mockResolvedValue({ get: () => ({ value: "token" }) } as never);
  jest.mocked(verifyToken).mockResolvedValue({ id: actorId, role: "owner" });
  jest.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit: account }) }) } as never);
  account.mockResolvedValue([{ id: actorId, role: "manager", isActive: true }]);
  load.mockResolvedValue(createPaidAnalyticsReport([], "Custom", dates, before));
});

function request(query = "range=Custom&startDate=2026-10-22&endDate=2026-10-22") {
  return new Request(`http://localhost/api/analytics?${query}`);
}

test.each(["manager", "owner"] as const)("an active %s can load payment analytics", async (role) => {
  account.mockResolvedValue([{ id: actorId, role, isActive: true }]);
  const result = await GET(request());
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(load).toHaveBeenCalledWith("Custom", dates, before);
  expect((await result.json()).source).toBe("payments");
});

test("checks the current database role instead of an old owner token", async () => {
  account.mockResolvedValue([{ id: actorId, role: "staff", isActive: true }]);
  expect((await GET(request())).status).toBe(403);
  expect(load).not.toHaveBeenCalled();
});

test.each([
  { accounts: [] },
  { accounts: [{ id: actorId, role: "owner" as const, isActive: false }] },
])("rejects missing or inactive accounts", async ({ accounts }) => {
  account.mockResolvedValue(accounts);
  expect((await GET(request())).status).toBe(401);
  expect(load).not.toHaveBeenCalled();
});

test("requires a valid sign-in before querying analytics", async () => {
  jest.mocked(verifyToken).mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect(db.select).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
});

test.each(["range=bad", "range=Custom", "range=Custom&startDate=2026-10-22&endDate=2026-10-21"])("rejects invalid report requests: %s", async (query) => {
  expect((await GET(request(query))).status).toBe(400);
  expect(load).not.toHaveBeenCalled();
});

test("returns a load error instead of substituting demo sales", async () => {
  load.mockRejectedValueOnce(new Error("Database offline"));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const result = await GET(request());
    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ message: "Could not load Analytics." });
  } finally {
    log.mockRestore();
  }
});
