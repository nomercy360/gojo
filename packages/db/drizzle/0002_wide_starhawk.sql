ALTER TABLE "lessons" ADD COLUMN "max_students" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "jlpt_level" text;