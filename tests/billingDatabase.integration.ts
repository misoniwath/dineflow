import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { Pool } from "pg";
import type { Bill, RecordBillPaymentInput } from "@/types/Bill";

// This command requires an explicit, empty test database; it never uses the app URL.
const connectionString = process.env.BILLING_TEST_DATABASE_URL;
if (!connectionString)
  throw new Error("Set BILLING_TEST_DATABASE_URL to an empty test database.");
const pool = new Pool({ connectionString });
let billing: typeof import("@/lib/db/billing");
let orderApi: typeof import("@/app/api/orders/route");
let appDb: typeof import("@/lib/db/index");
const menuId = "10000000-0000-4000-8000-000000000001";
const inventoryId = "20000000-0000-4000-8000-000000000001";

before(async () => {
  const existing = await pool.query("SELECT to_regclass('orders') AS existing");
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
  billing = await import("@/lib/db/billing");
  orderApi = await import("@/app/api/orders/route");
  appDb = await import("@/lib/db/index");
});
after(async () => {
  if (appDb) await (appDb.db.$client as Pool).end();
  await pool.end();
});
beforeEach(async () => {
  await pool.query(
    "TRUNCATE bill_payment_orders, bill_payments, menu_order_items, orders, inventory_menu_items, menu_items, inventory_items, suppliers, floor_tables CASCADE",
  );
  await pool.query(
    "INSERT INTO menu_items (id, name, price) VALUES ($1, 'Dinner special', 1001)",
    [menuId],
  );
  await pool.query(
    "INSERT INTO floor_tables (number, seats, shape, zone, x, y, guests) VALUES (4, 4, 'square', 'main_hall', 0, 0, 2)",
  );
});

async function submitOrder(tableNumber: number, quantity = 1) {
  const response = await orderApi.POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Deliberately incorrect client price: the saved price must come from the server.
      body: JSON.stringify({
        tableNumber,
        items: [{ menuItemId: menuId, quantity, price: 1 }],
      }),
    }),
  );
  assert.equal(response.status, 200);
  return (await response.json()).order.id as string;
}
function paymentInput(bill: Bill): RecordBillPaymentInput {
  return {
    tableNumber: bill.tableNumber,
    orderIds: bill.orderIds,
    expectedTotalCents: bill.totalCents,
    guestCount: bill.guestCount,
    guestAssignments: {},
  };
}

test("combines unpaid orders per table using saved server prices; served remains unpaid", async () => {
  const first = await submitOrder(4);
  const second = await submitOrder(4, 2);
  await submitOrder(5);
  await pool.query("UPDATE orders SET status = 'completed' WHERE id = $1", [
    first,
  ]);
  const bills = await billing.listBills();
  assert.equal(bills.length, 2);
  const bill = bills.find((candidate) => candidate.tableNumber === 4)!;
  assert.deepEqual(new Set(bill.orderIds), new Set([first, second]));
  assert.equal(bill.totalCents, 3003);
  assert.equal(bill.guestCount, 2);
  assert.equal(bill.status, "unpaid");
  assert.ok(bill.items.every((item) => item.unitPriceCents === 1001));
});

test("records one combined receipt; menu edits and later orders do not change it", async () => {
  await submitOrder(4);
  await submitOrder(4, 2);
  const [open] = await billing.listBills();
  const paid = await billing.recordBillPayment(paymentInput(open));
  assert.equal(paid.totalCents, 3003);
  assert.equal(paid.orderIds.length, 2);
  const kitchen = await pool.query("SELECT DISTINCT status FROM orders");
  assert.deepEqual(kitchen.rows, [{ status: "pending" }]);
  await pool.query(
    "UPDATE menu_items SET price = 7000, name = 'Renamed dish' WHERE id = $1",
    [menuId],
  );
  const later = await submitOrder(4);
  const bills = await billing.listBills();
  const next = bills.find((bill) => bill.status === "unpaid")!;
  const receipt = bills.find((bill) => bill.status === "paid")!;
  assert.deepEqual(next.orderIds, [later]);
  assert.equal(next.totalCents, 7000);
  assert.equal(receipt.id, paid.id);
  assert.equal(receipt.totalCents, 3003);
  assert.ok(
    receipt.items.every(
      (item) => item.name === "Dinner special" && item.unitPriceCents === 1001,
    ),
  );
});

test("concurrent payment requests cannot settle the same orders twice", async () => {
  await submitOrder(4);
  const [bill] = await billing.listBills();
  const results = await Promise.allSettled([
    billing.recordBillPayment(paymentInput(bill)),
    billing.recordBillPayment(paymentInput(bill)),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(
    rejected?.status === "rejected" &&
      rejected.reason instanceof billing.BillingError,
  );
  assert.equal(rejected.reason.status, 409);
  assert.equal(
    (await pool.query("SELECT count(*)::int AS count FROM bill_payments"))
      .rows[0].count,
    1,
  );
});

test("rejects changed orders, cancelled orders, and incorrect totals before recording payment", async () => {
  const first = await submitOrder(4);
  const [stale] = await billing.listBills();
  await submitOrder(4);
  await assert.rejects(billing.recordBillPayment(paymentInput(stale)), {
    status: 409,
  });
  const [current] = await billing.listBills();
  await assert.rejects(
    billing.recordBillPayment({
      ...paymentInput(current),
      expectedTotalCents: 1,
    }),
    { status: 409 },
  );
  await pool.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [
    first,
  ]);
  await assert.rejects(billing.recordBillPayment(paymentInput(current)), {
    status: 409,
  });
  assert.equal(
    (await pool.query("SELECT count(*)::int AS count FROM bill_payments"))
      .rows[0].count,
    0,
  );
});

test("a failed inventory write rolls back the complete order", async () => {
  const supplierId = "30000000-0000-4000-8000-000000000001";
  await pool.query(
    "INSERT INTO suppliers (id, name, phone, email) VALUES ($1, 'Test', '', '')",
    [supplierId],
  );
  await pool.query(
    "INSERT INTO inventory_items (id, name, unit, on_hand, supplier_id) VALUES ($1, 'Ingredient', 'kg', 10, $2)",
    [inventoryId, supplierId],
  );
  await pool.query(
    "INSERT INTO inventory_menu_items (menu_item_id, inventory_item_id, quantity_required) VALUES ($1, $2, 1)",
    [menuId, inventoryId],
  );
  await pool.query(
    "CREATE FUNCTION reject_test_inventory() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test inventory failure'; END; $$",
  );
  await pool.query(
    "CREATE TRIGGER reject_test_inventory BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION reject_test_inventory()",
  );
  const logError = console.error;
  try {
    console.error = () => {};
    const response = await orderApi.POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: 4,
          items: [{ menuItemId: menuId, quantity: 1 }],
        }),
      }),
    );
    assert.equal(response.status, 500);
    assert.equal(
      (await pool.query("SELECT count(*)::int AS count FROM orders")).rows[0]
        .count,
      0,
    );
    assert.equal(
      (await pool.query("SELECT count(*)::int AS count FROM menu_order_items"))
        .rows[0].count,
      0,
    );
    assert.equal(
      (await pool.query("SELECT on_hand FROM inventory_items")).rows[0].on_hand,
      10,
    );
  } finally {
    console.error = logError;
    await pool.query(
      "DROP TRIGGER reject_test_inventory ON inventory_items; DROP FUNCTION reject_test_inventory()",
    );
  }
});
