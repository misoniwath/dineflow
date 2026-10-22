CREATE TABLE "bill_payment_orders" (
	"order_id" uuid PRIMARY KEY,
	"payment_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"table_number" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"guest_count" integer NOT NULL,
	"items" jsonb NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bill_payment_orders_payment_idx" ON "bill_payment_orders" ("payment_id");--> statement-breakpoint
ALTER TABLE "bill_payment_orders" ADD CONSTRAINT "bill_payment_orders_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "bill_payment_orders" ADD CONSTRAINT "bill_payment_orders_payment_id_bill_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "bill_payments"("id");