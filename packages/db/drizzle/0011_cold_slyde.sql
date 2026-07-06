ALTER TABLE "training_totals" ADD COLUMN "current_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "training_totals" ADD COLUMN "last_active_date" date;