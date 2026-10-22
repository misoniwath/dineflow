import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { Pool } from "pg";

const connectionString = process.env.SCHEDULING_TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Set SCHEDULING_TEST_DATABASE_URL to an empty, disposable test database.",
  );
}
const pool = new Pool({ connectionString });
let scheduling: typeof import("@/lib/db/scheduling");
let appDb: typeof import("@/lib/db/index");
const staffId = "10000000-0000-4000-8000-000000000001";
const secondStaffId = "10000000-0000-4000-8000-000000000002";
const inactiveId = "10000000-0000-4000-8000-000000000003";
const input = {
  staffId,
  startsAt: "2026-10-22T11:00:00+07:00",
  endsAt: "2026-10-22T19:00:00+07:00",
  notes: "  Lunch cover.  ",
};

before(async () => {
  const existing = await pool.query(
    "SELECT current_database() AS name, to_regclass('users') AS existing",
  );
  assert.match(existing.rows[0].name, /^dineflow_scheduling_test/);
  assert.equal(
    existing.rows[0].existing,
    null,
    "Use an empty, disposable test database.",
  );
  for (const directory of readdirSync("drizzle").sort()) {
    await pool.query(
      readFileSync(join("drizzle", directory, "migration.sql"), "utf8"),
    );
  }
  process.env.DATABASE_URL = connectionString;
  scheduling = await import("@/lib/db/scheduling");
  appDb = await import("@/lib/db/index");
});

after(async () => {
  if (appDb) await (appDb.db.$client as Pool).end();
  await pool.end();
});

beforeEach(async () => {
  await pool.query("TRUNCATE users CASCADE");
  for (const [id, active] of [
    [staffId, true],
    [secondStaffId, true],
    [inactiveId, false],
  ] as const) {
    await pool.query(
      'INSERT INTO users (id, name, email, "passwordHash", "isActive") VALUES ($1, $2, $3, $4, $5)',
      [id, "Test employee", `${id}@test.invalid`, "unused-test-hash", active],
    );
  }
});

test("persists the shift with a server ID, trimmed notes, and the correct time zone", async () => {
  const shift = await scheduling.createStaffShift({
    ...input,
    id: "client-id",
  });
  assert.match(shift.id, /^[0-9a-f-]{36}$/);
  assert.equal(shift.startsAt, "2026-10-22T04:00:00.000Z");
  assert.equal(shift.endsAt, "2026-10-22T12:00:00.000Z");
  assert.equal(shift.notes, "Lunch cover.");
  const saved = await pool.query("SELECT id, notes FROM staff_shifts");
  assert.deepEqual(saved.rows, [{ id: shift.id, notes: "Lunch cover." }]);
});

test("rejects overlaps but permits adjacent shifts and the same hours for another employee", async () => {
  await scheduling.createStaffShift(input);
  await assert.rejects(
    scheduling.createStaffShift({
      ...input,
      startsAt: "2026-10-22T18:00:00+07:00",
      endsAt: "2026-10-22T20:00:00+07:00",
    }),
    (error: unknown) =>
      error instanceof scheduling.SchedulingError && error.status === 409,
  );
  await scheduling.createStaffShift({
    ...input,
    startsAt: input.endsAt,
    endsAt: "2026-10-22T21:00:00+07:00",
  });
  await scheduling.createStaffShift({ ...input, staffId: secondStaffId });
  assert.equal((await pool.query("SELECT * FROM staff_shifts")).rowCount, 3);
});

test("only one of two simultaneous overlapping requests can succeed", async () => {
  const results = await Promise.allSettled([
    scheduling.createStaffShift(input),
    scheduling.createStaffShift(input),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.ok(rejected.reason instanceof scheduling.SchedulingError);
  assert.equal(rejected.reason.status, 409);
  assert.equal((await pool.query("SELECT * FROM staff_shifts")).rowCount, 1);
});

test("rejects inactive or missing employees without inserting a shift", async () => {
  for (const id of [inactiveId, "10000000-0000-4000-8000-000000000099"]) {
    await assert.rejects(
      scheduling.createStaffShift({ ...input, staffId: id }),
      (error: unknown) =>
        error instanceof scheduling.SchedulingError && error.status === 400,
    );
  }
  assert.equal((await pool.query("SELECT * FROM staff_shifts")).rowCount, 0);
});

test("rejects invalid IDs, dates, time zones, time ordering, and notes", async () => {
  const invalid = [
    null,
    [],
    { ...input, staffId: "invalid" },
    { ...input, startsAt: "2026-02-30T11:00:00+07:00" },
    { ...input, startsAt: "2026-10-22T24:00:00+07:00" },
    { ...input, startsAt: "2026-10-22T11:00:00" },
    { ...input, startsAt: "2026-10-22T11:00:00+07:99" },
    { ...input, endsAt: input.startsAt },
    { ...input, endsAt: "2026-10-22T10:00:00+07:00" },
    { ...input, notes: 123 },
    { ...input, notes: "x".repeat(2001) },
  ];
  for (const body of invalid) {
    await assert.rejects(
      scheduling.createStaffShift(body),
      (error: unknown) =>
        error instanceof scheduling.SchedulingError && error.status === 400,
    );
  }
  assert.equal((await pool.query("SELECT * FROM staff_shifts")).rowCount, 0);
});

test("accepts overnight shifts and detects overlaps across midnight", async () => {
  await scheduling.createStaffShift({
    ...input,
    startsAt: "2026-10-22T22:00:00+07:00",
    endsAt: "2026-10-23T02:00:00+07:00",
  });
  await assert.rejects(
    scheduling.createStaffShift({
      ...input,
      startsAt: "2026-10-23T01:00:00+07:00",
      endsAt: "2026-10-23T04:00:00+07:00",
    }),
    (error: unknown) =>
      error instanceof scheduling.SchedulingError && error.status === 409,
  );
});

test("clock-in uses a database ID and timestamp and persists the entry", async () => {
  const before = (await pool.query("SELECT clock_timestamp() AS now")).rows[0].now as Date;
  const entry = await scheduling.recordStaffAttendance({
    staffId, action: "clock-in", id: "client-id",
    clockedInAt: "2000-01-01T00:00:00Z", clockedOutAt: "2000-01-01T01:00:00Z",
  });
  const after = (await pool.query("SELECT clock_timestamp() AS now")).rows[0].now as Date;
  assert.match(entry.id, /^[0-9a-f-]{36}$/);
  assert.equal(entry.staffId, staffId);
  assert.equal(entry.clockedOutAt, null);
  assert.ok(Date.parse(entry.clockedInAt) >= before.getTime());
  assert.ok(Date.parse(entry.clockedInAt) <= after.getTime());
  const saved = await pool.query("SELECT id, staff_id FROM staff_time_entries");
  assert.deepEqual(saved.rows, [{ id: entry.id, staff_id: staffId }]);
});

test("only one of two simultaneous clock-ins succeeds", async () => {
  const results = await Promise.allSettled([
    scheduling.recordStaffAttendance({ staffId, action: "clock-in" }),
    scheduling.recordStaffAttendance({ staffId, action: "clock-in" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.ok(rejected.reason instanceof scheduling.SchedulingError);
  assert.equal(rejected.reason.status, 409);
  assert.equal((await pool.query("SELECT * FROM staff_time_entries")).rowCount, 1);
});

test("closes an overnight entry once using database time", async () => {
  const clockedInAt = "2026-10-21T15:00:00.000Z";
  const inserted = await pool.query(
    "INSERT INTO staff_time_entries (staff_id, clocked_in_at) VALUES ($1, $2) RETURNING id",
    [staffId, clockedInAt],
  );
  const entryId = inserted.rows[0].id as string;
  const before = (await pool.query("SELECT clock_timestamp() AS now")).rows[0].now as Date;
  const results = await Promise.allSettled([
    scheduling.recordStaffAttendance({ staffId, action: "clock-out", entryId }),
    scheduling.recordStaffAttendance({ staffId, action: "clock-out", entryId }),
  ]);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  assert.equal(fulfilled.length, 1);
  assert.equal(fulfilled[0].value.id, entryId);
  assert.equal(fulfilled[0].value.clockedInAt, clockedInAt);
  assert.ok(Date.parse(fulfilled[0].value.clockedOutAt!) >= before.getTime());
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.ok(rejected.reason instanceof scheduling.SchedulingError);
  assert.equal(rejected.reason.status, 409);
  const saved = await pool.query("SELECT clocked_out_at FROM staff_time_entries WHERE id = $1", [entryId]);
  assert.equal(saved.rows[0].clocked_out_at.toISOString(), fulfilled[0].value.clockedOutAt);
});

test("a stale clock-out cannot close a later entry or another employee's entry", async () => {
  const first = await scheduling.recordStaffAttendance({ staffId, action: "clock-in" });
  await scheduling.recordStaffAttendance({ staffId, action: "clock-out", entryId: first.id });
  const current = await scheduling.recordStaffAttendance({ staffId, action: "clock-in" });
  const other = await scheduling.recordStaffAttendance({ staffId: secondStaffId, action: "clock-in" });
  for (const entryId of [first.id, other.id]) {
    await assert.rejects(
      scheduling.recordStaffAttendance({ staffId, action: "clock-out", entryId }),
      (error: unknown) => error instanceof scheduling.SchedulingError && error.status === 409,
    );
  }
  const open = await pool.query("SELECT id FROM staff_time_entries WHERE clocked_out_at IS NULL ORDER BY id");
  assert.deepEqual(open.rows.map((row) => row.id).sort(), [current.id, other.id].sort());
});

test("rejects clock-in for inactive employees but permits closing their existing entry", async () => {
  await assert.rejects(
    scheduling.recordStaffAttendance({ staffId: inactiveId, action: "clock-in" }),
    (error: unknown) => error instanceof scheduling.SchedulingError && error.status === 400,
  );
  const saved = await pool.query(
    "INSERT INTO staff_time_entries (staff_id) VALUES ($1) RETURNING id",
    [inactiveId],
  );
  const entry = await scheduling.recordStaffAttendance({ staffId: inactiveId, action: "clock-out", entryId: saved.rows[0].id });
  assert.notEqual(entry.clockedOutAt, null);
});

test("rejects invalid attendance actions, IDs, and employees without writing entries", async () => {
  for (const body of [
    null, [], {},
    { staffId: "invalid", action: "clock-in" },
    { staffId, action: "invalid" },
    { staffId, action: "clock-out" },
    { staffId, action: "clock-out", entryId: "invalid" },
    { staffId: "10000000-0000-4000-8000-000000000099", action: "clock-in" },
  ]) {
    await assert.rejects(
      scheduling.recordStaffAttendance(body),
      (error: unknown) => error instanceof scheduling.SchedulingError && error.status === 400,
    );
  }
  assert.equal((await pool.query("SELECT * FROM staff_time_entries")).rowCount, 0);
});

test("staff scheduling reads include only that employee's profile, shifts, and attendance", async () => {
  const ownShift = await scheduling.createStaffShift(input);
  await scheduling.createStaffShift({ ...input, staffId: secondStaffId });
  const ownEntry = await scheduling.recordStaffAttendance({ staffId, action: "clock-in" });
  await scheduling.recordStaffAttendance({ staffId: secondStaffId, action: "clock-in" });

  const personal = await scheduling.getStaffSchedule("2026-10-19", { id: staffId, role: "staff" });
  assert.equal(personal.currentUserId, staffId);
  assert.equal(personal.canManageSchedule, false);
  assert.deepEqual(personal.staff.map((person) => person.id), [staffId]);
  assert.deepEqual(personal.shifts.map((shift) => shift.id), [ownShift.id]);
  assert.deepEqual(personal.entries.map((entry) => entry.id), [ownEntry.id]);
});

test("managers and owners retain the full team schedule and attendance view", async () => {
  await scheduling.createStaffShift(input);
  await scheduling.createStaffShift({ ...input, staffId: secondStaffId });
  await scheduling.recordStaffAttendance({ staffId, action: "clock-in" });
  await scheduling.recordStaffAttendance({ staffId: secondStaffId, action: "clock-in" });

  for (const role of ["manager", "owner"] as const) {
    const team = await scheduling.getStaffSchedule("2026-10-19", { id: secondStaffId, role });
    assert.equal(team.currentUserId, secondStaffId);
    assert.equal(team.canManageSchedule, true);
    assert.equal(team.staff.length, 3);
    assert.equal(team.shifts.length, 2);
    assert.equal(team.entries.length, 2);
  }
});

test("rejects invalid week ranges before loading schedule data", async () => {
  for (const week of ["2026-10-22", "invalid", "2026-02-30"]) {
    await assert.rejects(
      scheduling.getStaffSchedule(week, { id: staffId, role: "staff" }),
      (error: unknown) => error instanceof scheduling.SchedulingError && error.status === 400,
    );
  }
});
