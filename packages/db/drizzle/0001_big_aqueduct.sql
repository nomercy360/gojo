CREATE TABLE "kanji" (
	"character" text PRIMARY KEY NOT NULL,
	"kname" text,
	"stroke_count" integer NOT NULL,
	"meaning" text NOT NULL,
	"grade" integer,
	"kunyomi_ja" text,
	"kunyomi" text,
	"onyomi_ja" text,
	"onyomi" text,
	"examples" jsonb,
	"radical" text,
	"rad_order" integer,
	"rad_stroke" integer,
	"rad_name_ja" text,
	"rad_name" text,
	"rad_meaning" text,
	"rad_position_ja" text,
	"rad_position" text,
	"hint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "radicals" (
	"id" integer PRIMARY KEY NOT NULL,
	"character" text NOT NULL,
	"stroke_count" integer NOT NULL,
	"meaning" text NOT NULL,
	"reading_ja" text,
	"reading" text,
	"r_filename" text,
	"anim_filename" text,
	"position_ja" text,
	"position" text
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_card_id" uuid,
	"word" text NOT NULL,
	"reading" text NOT NULL,
	"meaning" text NOT NULL,
	"stage" integer DEFAULT -1 NOT NULL,
	"modifier" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due" timestamp with time zone DEFAULT now() NOT NULL,
	"last_review" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_cards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"word" text NOT NULL,
	"reading" text NOT NULL,
	"meaning" text NOT NULL,
	"notes" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_lesson_card_id_lesson_cards_id_fk" FOREIGN KEY ("lesson_card_id") REFERENCES "public"."lesson_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_cards" ADD CONSTRAINT "lesson_cards_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_user_lesson_card_uniq" ON "flashcards" USING btree ("user_id","lesson_card_id");