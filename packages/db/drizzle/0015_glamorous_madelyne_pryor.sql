ALTER TABLE "user" ADD COLUMN "time_zone" text DEFAULT 'Europe/Moscow' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "time_zone" text DEFAULT 'Europe/Moscow' NOT NULL;