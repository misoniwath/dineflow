import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  real,
  varchar,
  date,
  time,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { BillItem } from "@/types/Bill";
import type { OrderInventoryDeduction } from "@/types/Order";

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */
// "guest" is deliberately not here: guests don't have an account, so they
// are never stored. They only exist in the client auth state.
export const userRole = pgEnum("user_role", ["staff", "manager", "owner"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`NOW()`),
};

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("passwordHash").notNull(),
    role: userRole().notNull().default("staff"),
    isActive: boolean().notNull().default(true),
    lastLoginAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);
/* ------------------------------------------------------------------ */
/* Staff Scheduling                                                     */
/* ------------------------------------------------------------------ */

export const staffShifts = pgTable(
  "staff_shifts",
  {
    id: uuid().primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => users.id),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
    }).notNull(),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("staff_shifts_staff_start_idx").on(t.staffId, t.startsAt),
    check(
      "staff_shifts_time_order",
      sql`${t.endsAt} > ${t.startsAt}`,
    ),
  ],
);

export const staffTimeEntries = pgTable(
  "staff_time_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => users.id),
    clockedInAt: timestamp("clocked_in_at", {
      withTimezone: true,
    })
      .notNull()
      .default(sql`clock_timestamp()`),
    clockedOutAt: timestamp("clocked_out_at", {
      withTimezone: true,
    }),
  },
  (t) => [
    index("staff_time_entries_staff_in_idx").on(
      t.staffId,
      t.clockedInAt,
    ),
    uniqueIndex("staff_time_entries_one_open_idx")
      .on(t.staffId)
      .where(sql`${t.clockedOutAt} IS NULL`),
    check(
      "staff_time_entries_time_order",
      sql`${t.clockedOutAt} IS NULL
          OR ${t.clockedOutAt} >= ${t.clockedInAt}`,
    ),
  ],
);


/* ------------------------------------------------------------------ */
/* Menu Items                                                          */
/* ------------------------------------------------------------------ */
export const menuCategoryEnum = pgEnum("menu_category", [
  "Starters",
  "Mains",
  "Desserts",
  "Beverages",
  "Sides",
]);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar("name").notNull(),
    price: integer("price").notNull(), // stored in cents or integer unit
    image: text("image"),
    desc: text("desc"),
    category: menuCategoryEnum().notNull().default("Starters"), // e.g., "Starters", "Mains"
    ...timestamps,
  },
  (t) => [index("menu_items_category_idx").on(t.category)],
);

/* ------------------------------------------------------------------ */
/* Suppliers & Inventory (Ingredients)                                */
/* ------------------------------------------------------------------ */
export const suppliers = pgTable("suppliers", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  ...timestamps,
});

export const unitEnum = pgEnum("unit_enum", [
  "pc",
  "lb",
  "kg",
  "oz",
  "l",
  "btl",
  "keg",
  "case",
]);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    unit: unitEnum().notNull(),
    onHand: real("on_hand").notNull().default(0),
    par: real("par").notNull().default(0),
    lowAt: real("low_at").notNull().default(0),
    expires: date("expires"),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    ...timestamps,
  },
  (t) => [index("inventory_supplier_idx").on(t.supplierId)],
);

export const menuInventoryItems = pgTable(
  "inventory_menu_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    quantityRequired: real("quantity_required").notNull(), // Amount of inventory unit needed per 1 dish order
    ...timestamps,
  },
  (t) => [index("inventory_menu_item_idx").on(t.menuItemId)],
);

/* ------------------------------------------------------------------ */
/* Orders & Order Items                                                */
/* ------------------------------------------------------------------ */
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    tableNumber: integer("table_number").notNull(),
    status: orderStatusEnum().notNull().default("pending"),
    // NULL identifies older orders whose actual stock deductions are unknown.
    inventoryDeductions: jsonb("inventory_deductions").$type<OrderInventoryDeduction[]>(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [index("orders_table_number_idx").on(t.tableNumber)],
);

export const orderItems = pgTable(
  "menu_order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    quantity: integer("quantity").notNull(),
    price: integer("price").notNull(), // Snapshot price in cents at time of order
    ...timestamps,
  },
  (t) => [index("menu_order_items_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Bill payments                                                       */
/* ------------------------------------------------------------------ */
export const billPayments = pgTable("bill_payments", {
  id: uuid().primaryKey().defaultRandom(),
  tableNumber: integer("table_number").notNull(),
  totalCents: integer("total_cents").notNull(),
  guestCount: integer("guest_count").notNull(),
  items: jsonb("items").$type<BillItem[]>().notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

// An order can belong to only one full payment, including concurrent requests.
export const billPaymentOrders = pgTable(
  "bill_payment_orders",
  {
    orderId: uuid("order_id")
      .primaryKey()
      .references(() => orders.id),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => billPayments.id),
  },
  (t) => [index("bill_payment_orders_payment_idx").on(t.paymentId)],
);

/* ------------------------------------------------------------------ */
/* Floor plan and table                                               */
/* ------------------------------------------------------------------ */
export const floorplanZoneEnum = pgEnum("floor_plan_zone", [
  "main_hall",
  "patio",
  "bar",
]);

export const floorplanShapeEnum = pgEnum("floor_plan_shape", [
  "round",
  "square",
  "rect",
]);

export const floorplanStatusEnum = pgEnum("floor_plan_status", [
  "free",
  "occupied",
  "reserved",
  "cleaning",
]);

export const floorTables = pgTable("floor_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull(),
  seats: integer("seats").notNull(),
  shape: floorplanShapeEnum().notNull().default("round"), // 'round', 'square', 'rect'
  zone: floorplanZoneEnum().notNull().default("main_hall"), // 'Main hall', 'Patio', 'Bar'
  x: real("x").notNull(),
  y: real("y").notNull(),
  status: floorplanStatusEnum().notNull().default("free"), // 'free', 'occupied', 'reserved', 'cleaning'
  guests: integer("guests").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`NOW()`),
});

/* ------------------------------------------------------------------ */
/* Reservation                                                        */
/* ------------------------------------------------------------------ */
export const reservationStatusEnum = pgEnum("reservation_status", [
  "booked",
  "seated",
  "completed",
  "cancelled",
  "no-show",
]);

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull().default(""),
  party: integer("party").notNull(),
  date: date("date").notNull(), // YYYY-MM-DD
  time: time("time").notNull(), // HH:mm
  notes: text("notes").notNull().default(""),
  status: reservationStatusEnum().notNull().default("booked"), // 'booked', 'seated', 'completed', 'cancelled', 'no-show'
  tableId: uuid("table_id").references(() => floorTables.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`NOW()`),
});
