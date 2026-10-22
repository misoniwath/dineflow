/** @jest-environment node */
import { beforeEach, expect, jest, test } from "@jest/globals";
import { cookies } from "next/headers";
import { POST } from "@/app/api/scheduling/shifts/route";
import { POST as attendancePost } from "@/app/api/scheduling/attendance/route";
import { GET as scheduleGet } from "@/app/api/scheduling/route";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import * as scheduling from "@/lib/db/scheduling";

jest.mock("server-only", () => ({}));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth/jwt", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/db/index", () => ({ db: { select: jest.fn() } }));

const actorId = "10000000-0000-4000-8000-000000000001";
const create = jest.spyOn(scheduling, "createStaffShift");
const recordAttendance = jest.spyOn(scheduling, "recordStaffAttendance");
const getSchedule = jest.spyOn(scheduling, "getStaffSchedule");
const account =
  jest.fn<
    () => Promise<
      { id: string; role: "owner" | "manager" | "staff"; isActive: boolean }[]
    >
  >();
const input = {
  staffId: "20000000-0000-4000-8000-000000000001",
  startsAt: "2026-10-22T11:00:00+07:00",
  endsAt: "2026-10-22T19:00:00+07:00",
  notes: "Lunch cover.",
};

function request() {
  return new Request("http://localhost/api/scheduling/shifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(cookies)
    .mockResolvedValue({ get: () => ({ value: "token" }) } as never);
  jest.mocked(verifyToken).mockResolvedValue({ id: actorId, role: "owner" });
  jest
    .mocked(db.select)
    .mockReturnValue({
      from: () => ({ where: () => ({ limit: account }) }),
    } as never);
  account.mockResolvedValue([{ id: actorId, role: "owner", isActive: true }]);
  create.mockResolvedValue({ id: "saved-shift", ...input });
  recordAttendance.mockResolvedValue({
    id: "saved-entry", staffId: actorId,
    clockedInAt: "2026-10-22T04:00:00.000Z", clockedOutAt: null,
  });
  getSchedule.mockResolvedValue({
    currentUserId: actorId, canManageSchedule: false,
    staff: [], shifts: [], entries: [],
  });
});

test.each(["owner", "manager"] as const)(
  "an active %s can create a shift",
  async (role) => {
    account.mockResolvedValue([{ id: actorId, role, isActive: true }]);
    const result = await POST(request());
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual({
      shift: { id: "saved-shift", ...input },
    });
    expect(create).toHaveBeenCalledWith(input);
  },
);

function attendanceRequest(body: unknown = { action: "clock-in" }) {
  return new Request("http://localhost/api/scheduling/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test.each(["owner", "manager", "staff"] as const)("an active %s can save their own attendance", async (role) => {
  account.mockResolvedValue([{ id: actorId, role, isActive: true }]);
  const result = await attendancePost(attendanceRequest());
  expect(result.status).toBe(201);
  expect(recordAttendance).toHaveBeenCalledWith({ staffId: actorId, action: "clock-in" });
  expect(await result.json()).toEqual({ entry: {
    id: "saved-entry", staffId: actorId,
    clockedInAt: "2026-10-22T04:00:00.000Z", clockedOutAt: null,
  } });
});

test("returns a closed attendance record after clock-out", async () => {
  const entry = { id: "saved-entry", staffId: actorId,
    clockedInAt: "2026-10-21T15:00:00.000Z", clockedOutAt: "2026-10-22T04:00:00.000Z" };
  recordAttendance.mockResolvedValueOnce(entry);
  const result = await attendancePost(attendanceRequest({ action: "clock-out", entryId: entry.id }));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ entry });
});

test.each([
  { role: "staff" as const, isActive: false, status: 401 },
  { role: "owner" as const, isActive: false, status: 401 },
])("rejects attendance changes by a $role with active=$isActive", async ({ role, isActive, status }) => {
  account.mockResolvedValue([{ id: actorId, role, isActive }]);
  expect((await attendancePost(attendanceRequest())).status).toBe(status);
  expect(recordAttendance).not.toHaveBeenCalled();
});

test.each(["owner", "manager", "staff"] as const)(
  "a %s cannot submit another employee's identity",
  async (role) => {
    account.mockResolvedValue([{ id: actorId, role, isActive: true }]);
    const result = await attendancePost(attendanceRequest({ staffId: input.staffId, action: "clock-in" }));
    expect(result.status).toBe(403);
    expect(recordAttendance).not.toHaveBeenCalled();
  },
);

test("rejects a malformed attendance request", async () => {
  expect((await attendancePost(attendanceRequest(null))).status).toBe(400);
  expect(recordAttendance).not.toHaveBeenCalled();
});

test.each(["owner", "manager", "staff"] as const)(
  "loads scheduling using the current database identity for a %s",
  async (role) => {
    account.mockResolvedValue([{ id: actorId, role, isActive: true }]);
    const result = await scheduleGet(new Request("http://localhost/api/scheduling?weekStart=2026-10-19&staffId=someone-else"));
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(getSchedule).toHaveBeenCalledWith("2026-10-19", { id: actorId, role });
  },
);

test("requires a login before reading the schedule", async () => {
  jest.mocked(verifyToken).mockResolvedValue(null);
  expect((await scheduleGet(new Request("http://localhost/api/scheduling"))).status).toBe(401);
  expect(getSchedule).not.toHaveBeenCalled();
});

test("requires a login before recording attendance", async () => {
  jest.mocked(verifyToken).mockResolvedValue(null);
  expect((await attendancePost(attendanceRequest())).status).toBe(401);
  expect(recordAttendance).not.toHaveBeenCalled();
});

test.each([400, 409] as const)("returns attendance validation and conflict errors (%s)", async (status) => {
  recordAttendance.mockRejectedValueOnce(new scheduling.SchedulingError("Attendance rejected", status));
  const result = await attendancePost(attendanceRequest());
  expect(result.status).toBe(status);
  expect(await result.json()).toEqual({ message: "Attendance rejected" });
});

test("checks the current database role even when an old token says owner", async () => {
  account.mockResolvedValue([{ id: actorId, role: "staff", isActive: true }]);
  expect((await POST(request())).status).toBe(403);
  expect(create).not.toHaveBeenCalled();
});

test("rejects inactive owners", async () => {
  account.mockResolvedValue([{ id: actorId, role: "owner", isActive: false }]);
  expect((await POST(request())).status).toBe(401);
  expect(create).not.toHaveBeenCalled();
});

test("requires a valid login before creating shifts", async () => {
  jest.mocked(verifyToken).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect(db.select).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

test.each([400, 409] as const)(
  "returns a %s validation or overlap error",
  async (status) => {
    create.mockRejectedValueOnce(
      new scheduling.SchedulingError("Shift rejected", status),
    );
    const result = await POST(request());
    expect(result.status).toBe(status);
    expect(await result.json()).toEqual({ message: "Shift rejected" });
  },
);
