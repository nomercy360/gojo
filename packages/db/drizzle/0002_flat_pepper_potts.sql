CREATE TYPE "public"."level_band" AS ENUM('N5', 'N4', 'N3');--> statement-breakpoint
CREATE TABLE "level_grammar" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"level_id" integer NOT NULL,
	"title" text NOT NULL,
	"pattern" text,
	"description_ru" text NOT NULL,
	"example_ja" text,
	"example_ru" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_kanji" (
	"level_id" integer NOT NULL,
	"character" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "level_kanji_level_id_character_pk" PRIMARY KEY("level_id","character")
);
--> statement-breakpoint
CREATE TABLE "level_vocab" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"level_id" integer NOT NULL,
	"word" text NOT NULL,
	"reading" text NOT NULL,
	"meaning_ru" text,
	"meaning_en" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" integer PRIMARY KEY NOT NULL,
	"band" "level_band" NOT NULL,
	"title" text,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "level_grammar" ADD CONSTRAINT "level_grammar_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_kanji" ADD CONSTRAINT "level_kanji_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_kanji" ADD CONSTRAINT "level_kanji_character_kanji_character_fk" FOREIGN KEY ("character") REFERENCES "public"."kanji"("character") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_vocab" ADD CONSTRAINT "level_vocab_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "level_grammar_level_title_uniq" ON "level_grammar" USING btree ("level_id","title");--> statement-breakpoint
CREATE UNIQUE INDEX "level_vocab_level_word_uniq" ON "level_vocab" USING btree ("level_id","word");