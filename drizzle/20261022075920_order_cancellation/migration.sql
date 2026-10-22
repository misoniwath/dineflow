ALTER TABLE "orders" ADD COLUMN "inventory_deductions" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_users_id_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id");