import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { cp, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { getRestaurantDate, getWeekStart } from "@/lib/scheduling";
import type { AnalyticsData } from "@/types/Analytics";
import type { Bill } from "@/types/Bill";

const connectionString = process.env.FEATURES_TEST_DATABASE_URL;
if (!connectionString || !/^\/dineflow_http_test_/.test(new URL(connectionString).pathname)) {
  throw new Error("Use a disposable dineflow_http_test_* database via npm run test:features.");
}
const pool = new Pool({ connectionString });
const projectRequire = createRequire(resolve("package.json"));
const password = randomBytes(24).toString("hex");
const staffId = "10000000-0000-4000-8000-000000000001";
const managerId = "10000000-0000-4000-8000-000000000002";
const menuId = "20000000-0000-4000-8000-000000000001";
const inventoryId = "30000000-0000-4000-8000-000000000001";
let server: ChildProcess | undefined;
let copyRoot: string | undefined;
let baseUrl: string;
let serverLog = "";
let staffCookie: string;
let managerCookie: string;

async function request(path: string, cookie?: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
  return fetch(`${baseUrl}${path}`, {
    method, redirect: "manual", signal: AbortSignal.timeout(60_000),
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function json<T = Record<string, unknown>>(response: Response, status = 200): Promise<T> {
  assert.equal(response.status, status, `${response.url}: ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  return response.json();
}
async function login(role: "staff" | "manager") {
  const response = await request("/api/auth/login", undefined, { email: `${role}@verify.invalid`, password });
  const data = await json<{ user: { id: string } }>(response);
  assert.equal(data.user.id, role === "staff" ? staffId : managerId);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  assert.ok(cookie.startsWith("auth_token="));
  return cookie;
}
async function placeOrder(quantity = 1) {
  const response = await request("/api/orders", staffCookie, {
    tableNumber: 4, items: [{ menuItemId: menuId, quantity, price: 1 }],
  });
  return (await json<{ order: { id: string } }>(response)).order.id;
}
async function bills() {
  return (await json<{ bills: Bill[] }>(await request("/api/bills", staffCookie))).bills;
}
async function stock() {
  return (await pool.query("SELECT on_hand FROM inventory_items WHERE id = $1", [inventoryId])).rows[0].on_hand as number;
}

before(async () => {
  assert.equal((await pool.query("SELECT to_regclass('users') AS existing")).rows[0].existing, null);
  for (const directory of (await readdir("drizzle")).sort()) {
    await pool.query(await readFile(join("drizzle", directory, "migration.sql"), "utf8"));
  }
  const hash = await projectRequire("bcrypt").hash(password, 4);
  for (const [id, role] of [[staffId, "staff"], [managerId, "manager"]]) {
    await pool.query('INSERT INTO users (id, name, email, "passwordHash", role) VALUES ($1, $2, $3, $4, $5)', [id, role, `${role}@verify.invalid`, hash, role]);
  }
  const supplier = await pool.query("INSERT INTO suppliers (name, phone, email) VALUES ('Verification supplier', '', '') RETURNING id");
  await pool.query("INSERT INTO inventory_items (id, name, unit, on_hand, supplier_id) VALUES ($1, 'Verification ingredient', 'kg', 20, $2)", [inventoryId, supplier.rows[0].id]);
  await pool.query("INSERT INTO menu_items (id, name, price) VALUES ($1, 'Verification dinner', 1000)", [menuId]);
  await pool.query("INSERT INTO inventory_menu_items (menu_item_id, inventory_item_id, quantity_required) VALUES ($1, $2, 2)", [menuId, inventoryId]);
  await pool.query("INSERT INTO floor_tables (number, seats, x, y, guests) VALUES (4, 4, 0, 0, 2)");

  // A separate source copy avoids the developer's running server and .next lock.
  const root = process.cwd();
  copyRoot = await mkdtemp(join(tmpdir(), "dineflow-http-"));
  for (const name of ["app", "components", "hooks", "lib", "stores", "styles", "types", "views", "public", "proxy.ts", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "package.json", "package-lock.json", "next-env.d.ts"]) {
    if (existsSync(join(root, name))) await cp(join(root, name), join(copyRoot, name), { recursive: true });
  }
  await symlink(join(root, "node_modules"), join(copyRoot, "node_modules"), "dir");
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const address = portProbe.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((done, reject) => portProbe.close((error) => error ? reject(error) : done()));
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", copyRoot, "--webpack", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: copyRoot,
    // The test process uses react-server to load server-only modules; Next's own
    // client compiler must run without that inherited condition or test context.
    env: { ...process.env, NODE_OPTIONS: "", NODE_TEST_CONTEXT: "", NODE_ENV: "development", DATABASE_URL: connectionString, JWT_SECRET: randomBytes(32).toString("hex"), NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const appendLog = (chunk: Buffer) => { serverLog = (serverLog + chunk.toString()).slice(-16_000); };
  server.stdout?.on("data", appendLog);
  server.stderr?.on("data", appendLog);
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) { ready = true; break; }
    } catch { /* The development server is still compiling. */ }
    await delay(250);
  }
  assert.ok(ready, `Could not start the isolated application:\n${serverLog}`);
  staffCookie = await login("staff");
  managerCookie = await login("manager");
}, { timeout: 150_000 });

after(async () => {
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill("SIGTERM");
    const force = setTimeout(() => server?.kill("SIGKILL"), 5000);
    await stopped;
    clearTimeout(force);
  }
  await pool.end();
  if (copyRoot) await rm(copyRoot, { recursive: true, force: true });
});

test("real login, anonymous protection, and manager-only analytics", async () => {
  const anonymous = await request("/api/bills");
  assert.equal(anonymous.status, 307);
  assert.match(anonymous.headers.get("location") ?? "", /\/login/);
  assert.equal((await request("/api/analytics?range=Today", staffCookie)).status, 403);
  const analytics = await json<AnalyticsData>(await request("/api/analytics?range=Today", managerCookie));
  assert.equal(analytics.source, "payments");
  assert.equal(analytics.summary.netSales, 0);
});

test("orders move through Kitchen, keep saved prices, and reconcile with Billing and Analytics", async () => {
  const first = await placeOrder();
  const second = await placeOrder(2);
  assert.equal(await stock(), 14);
  for (const status of ["preparing", "ready", "completed"]) {
    await json(await request(`/api/orders/${first}`, staffCookie, { status }, "PATCH"));
  }
  assert.equal((await request(`/api/orders/${first}`, staffCookie, { status: "cancelled", reason: "Too late" }, "PATCH")).status, 409);
  const [bill] = await bills();
  assert.deepEqual(new Set(bill.orderIds), new Set([first, second]));
  assert.equal(bill.totalCents, 3000);
  const payment = { tableNumber: 4, orderIds: bill.orderIds, expectedTotalCents: 3000, guestCount: 2, guestAssignments: {} };
  const paid = await json<{ bill: Bill }>(await request("/api/bills/payments", staffCookie, payment));
  assert.equal(paid.bill.status, "paid");
  assert.equal((await request("/api/bills/payments", staffCookie, payment)).status, 409);
  assert.equal((await request(`/api/orders/${second}`, staffCookie, { status: "cancelled", reason: "Paid" }, "PATCH")).status, 409);
  await pool.query("UPDATE menu_items SET name = 'Edited dinner', price = 9000 WHERE id = $1", [menuId]);
  const report = await json<AnalyticsData>(await request("/api/analytics?range=Today", managerCookie));
  assert.deepEqual(report.summary, { netSales: 3000, totalOrders: 2, averageTicket: 1500, covers: 2 });
  assert.deepEqual(report.menuPerformance.bestPerforming, [{ name: "Verification dinner", quantitySold: 3, sales: 3000 }]);
  const monthly = await json<AnalyticsData>(await request("/api/analytics?range=This+month", managerCookie));
  assert.equal(monthly.summary.netSales, 3000);
  assert.ok(monthly.salesData.length >= 1 && monthly.salesData.length <= 6);
  assert.equal(monthly.salesData.reduce((sum, point) => sum + point.sales, 0), 3000);
  assert.equal((await bills()).filter((entry) => entry.status === "unpaid").length, 0);
});

test("cancellation persists its audit, reverses stock once, and never adds sales", async () => {
  const beforeStock = await stock();
  const id = await placeOrder();
  assert.equal(await stock(), beforeStock - 2);
  const body = { status: "cancelled", reason: "  Duplicate order  ", cancelledBy: managerId };
  await json(await request(`/api/orders/${id}`, staffCookie, body, "PATCH"));
  await json(await request(`/api/orders/${id}`, staffCookie, body, "PATCH"));
  assert.equal(await stock(), beforeStock);
  const saved = (await pool.query("SELECT status, cancelled_by, cancelled_at, cancel_reason FROM orders WHERE id = $1", [id])).rows[0];
  assert.equal(saved.status, "cancelled");
  assert.equal(saved.cancelled_by, staffId);
  assert.equal(saved.cancel_reason, "Duplicate order");
  assert.ok(saved.cancelled_at instanceof Date);
  assert.equal((await bills()).some((bill) => bill.orderIds.includes(id)), false);
  const report = await json<AnalyticsData>(await request("/api/analytics?range=Today", managerCookie));
  assert.equal(report.summary.netSales, 3000);
});

test("shift creation and attendance use each employee's identity and persist after reload", async () => {
  const today = getRestaurantDate(new Date().toISOString());
  const shift = { staffId, startsAt: `${today}T09:00:00+07:00`, endsAt: `${today}T17:00:00+07:00`, notes: "Verification shift" };
  assert.equal((await request("/api/scheduling/shifts", staffCookie, shift)).status, 403);
  await json(await request("/api/scheduling/shifts", managerCookie, shift), 201);
  assert.equal((await request("/api/scheduling/shifts", managerCookie, shift)).status, 409);
  const clocked = await json<{ entry: { id: string; staffId: string; clockedOutAt: null } }>(await request("/api/scheduling/attendance", staffCookie, { action: "clock-in" }), 201);
  assert.equal(clocked.entry.staffId, staffId);
  assert.equal(clocked.entry.clockedOutAt, null);
  assert.equal((await request("/api/scheduling/attendance", staffCookie, { action: "clock-in" })).status, 409);
  assert.equal((await request("/api/scheduling/attendance", managerCookie, { action: "clock-out", entryId: clocked.entry.id, staffId })).status, 403);
  const week = getWeekStart(today);
  const personal = await json<{ staff: { id: string }[]; shifts: { staffId: string }[]; entries: { id: string }[] }>(await request(`/api/scheduling?weekStart=${week}`, staffCookie));
  assert.deepEqual(personal.staff.map((person) => person.id), [staffId]);
  assert.deepEqual(personal.shifts.map((entry) => entry.staffId), [staffId]);
  assert.deepEqual(personal.entries.map((entry) => entry.id), [clocked.entry.id]);
  const closed = await json<{ entry: { clockedOutAt: string } }>(await request("/api/scheduling/attendance", staffCookie, { action: "clock-out", entryId: clocked.entry.id }));
  assert.ok(Number.isFinite(Date.parse(closed.entry.clockedOutAt)));
  assert.equal((await pool.query("SELECT clocked_out_at FROM staff_time_entries WHERE id = $1", [clocked.entry.id])).rows[0].clocked_out_at.toISOString(), closed.entry.clockedOutAt);
});

test("changed feature pages compile and return HTML through the actual app router", async () => {
  for (const path of ["/order", "/kitchen", "/billing", "/scheduling", "/analytics"]) {
    const response = await request(path, managerCookie);
    assert.equal(response.status, 200, `${path} failed:\n${serverLog}`);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    const html = await response.text();
    assert.match(html, /Dineflow|DineFlow|dineflow/);
    assert.doesNotMatch(html, /id="__next_error__"/);
  }
});
