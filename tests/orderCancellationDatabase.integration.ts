import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { Pool } from "pg";
import type { Bill, RecordBillPaymentInput } from "@/types/Bill";

const connectionString = process.env.CANCELLATION_TEST_DATABASE_URL;
if (!connectionString || !/^\/dineflow_cancellation_test_/.test(new URL(connectionString).pathname)) {
  throw new Error("Set CANCELLATION_TEST_DATABASE_URL to a disposable dineflow_cancellation_test_* database.");
}
const pool = new Pool({ connectionString });
let cancellation: typeof import("@/lib/db/order-cancellation");
let billing: typeof import("@/lib/db/billing");
let orderApi: typeof import("@/app/api/orders/route");
let appDb: typeof import("@/lib/db/index");
const actorId = "10000000-0000-4000-8000-000000000001";
const menuId = "20000000-0000-4000-8000-000000000001";
const inventoryId = "30000000-0000-4000-8000-000000000001";
const secondInventoryId = "30000000-0000-4000-8000-000000000002";
const supplierId = "40000000-0000-4000-8000-000000000001";

before(async () => {
  assert.equal((await pool.query("SELECT to_regclass('orders') AS existing")).rows[0].existing, null);
  for (const directory of readdirSync("drizzle").sort()) {
    await pool.query(readFileSync(join("drizzle", directory, "migration.sql"), "utf8"));
  }
  process.env.DATABASE_URL = connectionString;
  cancellation = await import("@/lib/db/order-cancellation");
  billing = await import("@/lib/db/billing");
  orderApi = await import("@/app/api/orders/route");
  appDb = await import("@/lib/db/index");
});
after(async () => {
  if (appDb) await (appDb.db.$client as Pool).end();
  await pool.end();
});
beforeEach(async () => {
  await pool.query("TRUNCATE bill_payments, users, orders, inventory_menu_items, menu_items, inventory_items, suppliers, floor_tables CASCADE");
  await pool.query('INSERT INTO users (id, name, email, "passwordHash") VALUES ($1, \'Test staff\', \'cancel@example.test\', \'unused\')', [actorId]);
  await pool.query("INSERT INTO menu_items (id, name, price) VALUES ($1, 'Dinner', 1000)", [menuId]);
  await pool.query("INSERT INTO suppliers (id, name, phone, email) VALUES ($1, 'Test supplier', '', '')", [supplierId]);
  await pool.query("INSERT INTO inventory_items (id, name, unit, on_hand, supplier_id) VALUES ($1, 'Ingredient', 'kg', 10, $2)", [inventoryId, supplierId]);
  await pool.query("INSERT INTO inventory_menu_items (menu_item_id, inventory_item_id, quantity_required) VALUES ($1, $2, 2)", [menuId, inventoryId]);
  await pool.query("INSERT INTO floor_tables (number, seats, shape, zone, x, y, guests) VALUES (4, 4, 'square', 'main_hall', 0, 0, 2)");
});

async function placeOrder(quantity = 1) {
  const response = await orderApi.POST(new Request("http://localhost/api/orders", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableNumber: 4, items: [{ menuItemId: menuId, quantity }] }),
  }));
  assert.equal(response.status, 200);
  return (await response.json()).order.id as string;
}
async function stock(id = inventoryId) {
  return (await pool.query("SELECT on_hand FROM inventory_items WHERE id = $1", [id])).rows[0].on_hand as number;
}
async function order(id: string) {
  return (await pool.query("SELECT * FROM orders WHERE id = $1", [id])).rows[0];
}
async function eligibility(id: string) {
  const response = await orderApi.GET();
  assert.equal(response.status, 200);
  return (await response.json()).orders.find((saved: { id: string }) => saved.id === id);
}
function paymentInput(bill: Bill): RecordBillPaymentInput {
  return { tableNumber: bill.tableNumber, orderIds: bill.orderIds, expectedTotalCents: bill.totalCents, guestCount: bill.guestCount, guestAssignments: {} };
}

test("cancels without deleting the order, audits the employee, and removes only its bill items", async () => {
  const first = await placeOrder();
  const second = await placeOrder(2);
  assert.equal((await eligibility(first)).canCancel, true);
  assert.equal(await stock(), 4);
  await cancellation.cancelOrder(first, actorId, "  Duplicate order  ");
  const saved = await order(first);
  assert.equal(saved.status, "cancelled");
  assert.equal(saved.cancelled_by, actorId);
  assert.equal(saved.cancel_reason, "Duplicate order");
  assert.ok(saved.cancelled_at instanceof Date);
  assert.equal(await stock(), 6);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM menu_order_items WHERE order_id = $1", [first])).rows[0].count, 1);
  const [bill] = await billing.listBills();
  assert.deepEqual(bill.orderIds, [second]);
  assert.equal(bill.totalCents, 2000);
  assert.equal((await eligibility(first)).canCancel, false);
});

test("restores the saved deduction even after the recipe changes", async () => {
  const id = await placeOrder();
  await pool.query("UPDATE inventory_menu_items SET quantity_required = 7");
  await cancellation.cancelOrder(id, actorId, "Customer cancelled");
  assert.equal(await stock(), 10);
  assert.deepEqual((await order(id)).inventory_deductions, [{ inventoryItemId: inventoryId, quantity: 2 }]);
});

test("restores only the stock actually deducted when an order exhausted stock", async () => {
  await pool.query("UPDATE inventory_items SET on_hand = 3");
  const id = await placeOrder(3);
  assert.equal(await stock(), 0);
  assert.deepEqual((await order(id)).inventory_deductions, [{ inventoryItemId: inventoryId, quantity: 3 }]);
  await cancellation.cancelOrder(id, actorId, "Duplicate");
  assert.equal(await stock(), 3);
});

test("supports orders with no stock deductions", async () => {
  await pool.query("DELETE FROM inventory_menu_items");
  const id = await placeOrder();
  assert.deepEqual((await order(id)).inventory_deductions, []);
  await cancellation.cancelOrder(id, actorId, "Duplicate");
  assert.equal(await stock(), 10);
  assert.deepEqual(await billing.listBills(), []);
});

test("concurrent cancellation and retries restore stock once and preserve the first audit", async () => {
  const id = await placeOrder();
  const results = await Promise.all([
    cancellation.cancelOrder(id, actorId, "First request"),
    cancellation.cancelOrder(id, actorId, "Second request"),
  ]);
  assert.ok(results.every((result) => result.status === "cancelled"));
  const original = await order(id);
  await cancellation.cancelOrder(id, actorId, "Later retry");
  assert.equal(await stock(), 10);
  assert.deepEqual(await order(id), original);
});

test("blocks a paid order even while its kitchen status is placed", async () => {
  const id = await placeOrder();
  const [bill] = await billing.listBills();
  const receipt = await billing.recordBillPayment(paymentInput(bill));
  await assert.rejects(cancellation.cancelOrder(id, actorId, "Cancel paid order"), { status: 409 });
  assert.equal((await order(id)).status, "pending");
  assert.equal(await stock(), 8);
  const saved = await eligibility(id);
  assert.equal(saved.canCancel, false);
  assert.match(saved.cancellationBlockReason, /Paid orders/);
  assert.equal((await billing.listBills())[0].id, receipt.id);
});

test("blocks preparing, ready, and served orders", async () => {
  for (const status of ["preparing", "ready", "completed"]) {
    const id = await placeOrder();
    const beforeStock = await stock();
    await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
    await assert.rejects(cancellation.cancelOrder(id, actorId, "Too late"), { status: 409 });
    assert.equal((await order(id)).status, status);
    assert.equal(await stock(), beforeStock);
  }
});

test("rejects missing orders and blank or overlong reasons without changing stock", async () => {
  const id = await placeOrder();
  for (const reason of [undefined, null, "", "  ", "a".repeat(501)]) {
    await assert.rejects(cancellation.cancelOrder(id, actorId, reason), { status: 400 });
  }
  await assert.rejects(cancellation.cancelOrder("99999999-0000-4000-8000-000000000001", actorId, "Missing"), { status: 404 });
  assert.equal((await order(id)).status, "pending");
  assert.equal(await stock(), 8);
});

test("blocks legacy orders with no saved deduction record", async () => {
  const id = await placeOrder();
  await pool.query("UPDATE orders SET inventory_deductions = NULL WHERE id = $1", [id]);
  await assert.rejects(cancellation.cancelOrder(id, actorId, "Legacy order"), { status: 409 });
  const saved = await eligibility(id);
  assert.equal(saved.canCancel, false);
  assert.match(saved.cancellationBlockReason, /stock review/);
  assert.equal(await stock(), 8);
});

test("blocks cancellation if a deducted ingredient was deleted", async () => {
  const id = await placeOrder();
  await pool.query("DELETE FROM inventory_items WHERE id = $1", [inventoryId]);
  await assert.rejects(cancellation.cancelOrder(id, actorId, "Missing ingredient"), { status: 409 });
  assert.equal((await order(id)).status, "pending");
  assert.equal((await order(id)).cancelled_at, null);
});

test("cancellation and starting preparation cannot both succeed", async () => {
  const id = await placeOrder();
  const [cancel, preparing] = await Promise.allSettled([
    cancellation.cancelOrder(id, actorId, "Duplicate"),
    pool.query("UPDATE orders SET status = 'preparing' WHERE id = $1 AND status = 'pending' RETURNING id", [id]),
  ]);
  assert.equal(preparing.status, "fulfilled");
  if (preparing.status !== "fulfilled") return;
  if (cancel.status === "fulfilled") {
    assert.equal(preparing.value.rowCount, 0);
    assert.equal((await order(id)).status, "cancelled");
    assert.equal(await stock(), 10);
  } else {
    assert.equal(cancel.reason.status, 409);
    assert.equal(preparing.value.rowCount, 1);
    assert.equal((await order(id)).status, "preparing");
    assert.equal(await stock(), 8);
  }
});

test("cancellation and payment cannot both succeed", async () => {
  const id = await placeOrder();
  const [bill] = await billing.listBills();
  const results = await Promise.allSettled([
    cancellation.cancelOrder(id, actorId, "Duplicate"),
    billing.recordBillPayment(paymentInput(bill)),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected");
  assert.equal(rejected.reason.status, 409);
  const paid = (await pool.query("SELECT count(*)::int AS count FROM bill_payments")).rows[0].count;
  if (results[0].status === "fulfilled") {
    assert.equal((await order(id)).status, "cancelled");
    assert.equal(await stock(), 10);
    assert.equal(paid, 0);
  } else {
    assert.equal((await order(id)).status, "pending");
    assert.equal(await stock(), 8);
    assert.equal(paid, 1);
  }
});

test("a failed stock restoration rolls back every ingredient and the cancellation audit", async () => {
  await pool.query("INSERT INTO inventory_items (id, name, unit, on_hand, supplier_id) VALUES ($1, 'Second ingredient', 'kg', 10, $2)", [secondInventoryId, supplierId]);
  await pool.query("INSERT INTO inventory_menu_items (menu_item_id, inventory_item_id, quantity_required) VALUES ($1, $2, 1)", [menuId, secondInventoryId]);
  const id = await placeOrder();
  await pool.query("CREATE FUNCTION reject_cancel_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '30000000-0000-4000-8000-000000000002' THEN RAISE EXCEPTION 'test stock failure'; END IF; RETURN NEW; END; $$");
  await pool.query("CREATE TRIGGER reject_cancel_stock BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION reject_cancel_stock()");
  try {
    await assert.rejects(cancellation.cancelOrder(id, actorId, "Duplicate"));
    assert.equal(await stock(), 8);
    assert.equal(await stock(secondInventoryId), 9);
    const saved = await order(id);
    assert.equal(saved.status, "pending");
    assert.equal(saved.cancelled_at, null);
    assert.equal(saved.cancelled_by, null);
    assert.equal(saved.cancel_reason, null);
  } finally {
    await pool.query("DROP TRIGGER reject_cancel_stock ON inventory_items");
    await pool.query("DROP FUNCTION reject_cancel_stock()");
  }
});
