ALTER TABLE "user" ADD COLUMN "quiz_level" text;--> statement-breakpoint
ALTER TABLE "training_totals" ADD COLUMN "kanji_seconds" integer DEFAULT 0 NOT NULL;