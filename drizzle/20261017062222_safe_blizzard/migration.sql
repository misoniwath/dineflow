CREATE TYPE "user_role" AS ENUM('staff', 'manager', 'owner');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"userId" uuid NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"userAgent" text,
	"ipAddress" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "user_role" DEFAULT 'staff'::"user_role" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastLoginAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("userId");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" (lower("email"));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;