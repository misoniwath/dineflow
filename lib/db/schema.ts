import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  real,
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
    name: text().notNull(),
    email: text().notNull(),
    passwordHash: text().notNull(),
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
    name: text("name").notNull(),
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
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  ...timestamps,
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    onHand: integer("on_hand").notNull().default(0),
    par: integer("par").notNull().default(0),
    lowAt: integer("low_at").notNull().default(0),
    expires: text("expires"), // ISO date string or null
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    ...timestamps,
  },
  (t) => [index("inventory_supplier_idx").on(t.supplierId)],
);

export const menuInventoryItems = pgTable(
  "menu_inventory_items",
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
  (t) => [index("menu_inventory_item_idx").on(t.menuItemId)],
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
  "order_items",
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
  (t) => [index("order_items_order_id_idx").on(t.orderId)],
);
