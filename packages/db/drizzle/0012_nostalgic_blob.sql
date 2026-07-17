CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"level_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"source_book" text,
	"source_chapter" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "level_vocab" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "level_vocab_id" uuid;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_vocab" ADD CONSTRAINT "level_vocab_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_level_vocab_id_level_vocab_id_fk" FOREIGN KEY ("level_vocab_id") REFERENCES "public"."level_vocab"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_user_level_vocab_uniq" ON "flashcards" USING btree ("user_id","level_vocab_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_user_word_uniq" ON "flashcards" USING btree ("user_id","word");