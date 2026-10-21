CREATE TYPE "floor_plan_shape" AS ENUM('round', 'square', 'rect');--> statement-breakpoint
CREATE TYPE "floor_plan_status" AS ENUM('free', 'occupied', 'reserved', 'cleaning');--> statement-breakpoint
CREATE TYPE "floor_plan_zone" AS ENUM('main_hall', 'patio', 'bar');--> statement-breakpoint
CREATE TYPE "menu_category" AS ENUM('Starters', 'Mains', 'Desserts', 'Beverages', 'Sides');--> statement-breakpoint
CREATE TYPE "order_status" AS ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "reservation_status" AS ENUM('booked', 'seated', 'completed', 'cancelled', 'no-show');--> statement-breakpoint
CREATE TYPE "unit_enum" AS ENUM('pc', 'lb', 'kg', 'oz', 'l', 'btl', 'keg', 'case');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('staff', 'manager', 'owner');--> statement-breakpoint
CREATE TABLE "floor_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"number" integer NOT NULL,
	"seats" integer NOT NULL,
	"shape" "floor_plan_shape" DEFAULT 'round'::"floor_plan_shape" NOT NULL,
	"zone" "floor_plan_zone" DEFAULT 'main_hall'::"floor_plan_zone" NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"status" "floor_plan_status" DEFAULT 'free'::"floor_plan_status" NOT NULL,
	"guests" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"unit" "unit_enum" NOT NULL,
	"on_hand" real DEFAULT 0 NOT NULL,
	"par" real DEFAULT 0 NOT NULL,
	"low_at" real DEFAULT 0 NOT NULL,
	"expires" date,
	"supplier_id" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"menu_item_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity_required" real NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar NOT NULL,
	"price" integer NOT NULL,
	"image" text,
	"desc" text,
	"category" "menu_category" DEFAULT 'Starters'::"menu_category" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"table_number" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending'::"order_status" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"phone" varchar(64) DEFAULT '' NOT NULL,
	"party" integer NOT NULL,
	"date" date NOT NULL,
	"time" time NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "reservation_status" DEFAULT 'booked'::"reservation_status" NOT NULL,
	"table_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "user_role" DEFAULT 'staff'::"user_role" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastLoginAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inventory_supplier_idx" ON "inventory_items" ("supplier_id");--> statement-breakpoint
CREATE INDEX "inventory_menu_item_idx" ON "inventory_menu_items" ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" ("category");--> statement-breakpoint
CREATE INDEX "menu_order_items_idx" ON "menu_order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_table_number_idx" ON "orders" ("table_number");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" (lower("email"));--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id");--> statement-breakpoint
ALTER TABLE "inventory_menu_items" ADD CONSTRAINT "inventory_menu_items_menu_item_id_menu_items_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "inventory_menu_items" ADD CONSTRAINT "inventory_menu_items_inventory_item_id_inventory_items_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "menu_order_items" ADD CONSTRAINT "menu_order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "menu_order_items" ADD CONSTRAINT "menu_order_items_menu_item_id_menu_items_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_floor_tables_id_fkey" FOREIGN KEY ("table_id") REFERENCES "floor_tables"("id") ON DELETE SET NULL;