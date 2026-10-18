import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
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
/* Menu Items                                                          */
/* ------------------------------------------------------------------ */
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar("name").notNull(),
    price: integer("price").notNull(), // stored in cents or integer unit
    image: text("image"),
    desc: text("desc"),
    category: text("category").notNull(), // e.g., "Starters", "Mains"
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
