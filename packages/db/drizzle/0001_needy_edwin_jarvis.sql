DROP TABLE "radicals" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "current_level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "kanji" ADD COLUMN "jlpt" integer;