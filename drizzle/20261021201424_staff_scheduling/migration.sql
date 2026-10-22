CREATE TABLE "staff_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"staff_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_shifts_time_order" CHECK ("ends_at" > "starts_at")
);
--> statement-breakpoint
CREATE TABLE "staff_time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"staff_id" uuid NOT NULL,
	"clocked_in_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"clocked_out_at" timestamp with time zone,
	CONSTRAINT "staff_time_entries_time_order" CHECK ("clocked_out_at" IS NULL
          OR "clocked_out_at" >= "clocked_in_at")
);
--> statement-breakpoint
CREATE INDEX "staff_shifts_staff_start_idx" ON "staff_shifts" ("staff_id","starts_at");--> statement-breakpoint
CREATE INDEX "staff_time_entries_staff_in_idx" ON "staff_time_entries" ("staff_id","clocked_in_at");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_time_entries_one_open_idx" ON "staff_time_entries" ("staff_id") WHERE "clocked_out_at" IS NULL;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_id_users_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "staff_time_entries" ADD CONSTRAINT "staff_time_entries_staff_id_users_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id");