import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { Pool } from "pg";

const connectionString = process.env.ANALYTICS_TEST_DATABASE_URL;
if (!connectionString) throw new Error("Set ANALYTICS_TEST_DATABASE_URL to an empty, disposable test database.");
const pool = new Pool({ connectionString });
let analytics: typeof import("@/lib/db/analytics");
let billing: typeof import("@/lib/db/billing");
let appDb: typeof import("@/lib/db/index");
const menuId = "10000000-0000-4000-8000-000000000001";
const selection = { startDate: "2026-10-22", endDate: "2026-10-22" };
const comparison = { startDate: "2026-10-21", endDate: "2026-10-21" };

before(async () => {
  const existing = await pool.query("SELECT current_database() AS name, to_regclass('orders') AS existing");
  assert.match(existing.rows[0].name, /^dineflow_analytics_test/);
  assert.equal(existing.rows[0].existing, null, "Use an empty, disposable test database.");
  for (const directory of readdirSync("drizzle").sort()) {
    await pool.query(readFileSync(join("drizzle", directory, "migration.sql"), "utf8"));
  }
  process.env.DATABASE_URL = connectionString;
  analytics = await import("@/lib/db/analytics");
  billing = await import("@/lib/db/billing");
  appDb = await import("@/lib/db/index");
});

after(async () => {
  if (appDb) await (appDb.db.$client as Pool).end();
  await pool.end();
});

beforeEach(async () => {
  await pool.query("TRUNCATE bill_payment_orders, bill_payments, menu_order_items, orders, menu_items, floor_tables CASCADE");
  await pool.query("INSERT INTO menu_items (id, name, price) VALUES ($1, 'Saved dinner', 1001)", [menuId]);
  await pool.query("INSERT INTO floor_tables (number, seats, x, y, guests) VALUES (4, 4, 0, 0, 2)");
});

async function order(quantity = 1, table = 4, status = "pending") {
  const inserted = await pool.query("INSERT INTO orders (table_number, status) VALUES ($1, $2) RETURNING id", [table, status]);
  const id = inserted.rows[0].id as string;
  const item = await pool.query(
    "INSERT INTO menu_order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, 1001) RETURNING id",
    [id, menuId, quantity],
  );
  return { id, itemId: item.rows[0].id as string };
}

async function receipt(paidAt: string, cents: number) {
  const savedOrder = await order();
  const items = [{ id: savedOrder.itemId, name: "Saved dinner", quantity: 1, unitPriceCents: cents, guestNumber: null }];
  const payment = await pool.query(
    "INSERT INTO bill_payments (table_number, total_cents, guest_count, items, paid_at) VALUES (4, $1, 1, $2::jsonb, $3) RETURNING id",
    [cents, JSON.stringify(items), paidAt],
  );
  await pool.query("INSERT INTO bill_payment_orders (order_id, payment_id) VALUES ($1, $2)", [savedOrder.id, payment.rows[0].id]);
}

test("empty periods contain zero sales and zero comparison values", async () => {
  const report = await analytics.getSavedAnalytics("Today", selection, comparison);
  assert.equal(report.source, "payments");
  assert.deepEqual(report.summary, { netSales: 0, averageTicket: 0, totalOrders: 0, covers: 0 });
  assert.deepEqual(report.previousSummary, report.summary);
  assert.equal(report.salesData.length, 24);
});

test("counts a combined receipt once and excludes unpaid, served-unpaid, and cancelled orders", async () => {
  await order();
  await order(2);
  await order(1, 5);
  await order(1, 6, "completed");
  await order(1, 7, "cancelled");
  const bill = (await billing.listBills()).find((candidate) => candidate.tableNumber === 4)!;
  const paid = await billing.recordBillPayment({
    tableNumber: 4, orderIds: bill.orderIds, expectedTotalCents: 3003,
    guestCount: 2, guestAssignments: {},
  });
  await pool.query("UPDATE bill_payments SET paid_at = '2026-10-22T05:00:00Z' WHERE id = $1", [paid.id]);
  await pool.query("UPDATE menu_items SET price = 9000, name = 'Renamed dinner' WHERE id = $1", [menuId]);
  await pool.query("UPDATE floor_tables SET guests = 4 WHERE number = 4");
  const report = await analytics.getSavedAnalytics("Today", selection, comparison);
  assert.deepEqual(report.summary, { netSales: 3003, totalOrders: 2, averageTicket: 1502, covers: 2 });
  assert.deepEqual(report.menuPerformance.bestPerforming, [{ name: "Saved dinner", quantitySold: 3, sales: 3003 }]);
  assert.equal(report.salesData.reduce((sum, point) => sum + point.sales, 0), 3003);
});

test("uses inclusive local dates and excludes the following local midnight", async () => {
  await receipt("2026-10-21T16:59:59.999Z", 1000);
  await receipt("2026-10-21T17:00:00.000Z", 2000);
  await receipt("2026-10-22T16:59:59.999Z", 3000);
  await receipt("2026-10-22T17:00:00.000Z", 4000);
  const report = await analytics.getSavedAnalytics("Today", selection, comparison);
  assert.equal(report.summary.netSales, 5000);
  assert.equal(report.summary.totalOrders, 2);
  assert.equal(report.summary.covers, 2);
  assert.equal(report.previousSummary?.netSales, 1000);
  assert.equal(report.salesData[0].sales, 2000);
  assert.equal(report.salesData[23].sales, 3000);
});

test("custom periods preserve empty days and compare only the preceding dates", async () => {
  await receipt("2026-10-19T05:00:00Z", 1000);
  await receipt("2026-10-22T05:00:00Z", 3000);
  const report = await analytics.getSavedAnalytics("Custom",
    { startDate: "2026-10-21", endDate: "2026-10-23" },
    { startDate: "2026-10-18", endDate: "2026-10-20" });
  assert.deepEqual(report.salesData.map((point) => point.sales), [0, 3000, 0]);
  assert.equal(report.summary.netSales, 3000);
  assert.equal(report.previousSummary?.netSales, 1000);
});
