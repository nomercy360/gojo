CREATE TYPE "public"."user_role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."homework_status" AS ENUM('pending', 'done', 'missed');--> statement-breakpoint
CREATE TYPE "public"."homework_submission_status" AS ENUM('submitted', 'ai_reviewed', 'approved', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'canceled');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"nickname" text,
	"jlpt_level" text,
	"quiz_level" text,
	"telegram_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_telegramId_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text,
	"assignee_id" text,
	"trial_lesson_id" uuid,
	"kind" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"contact" text,
	"level" text,
	"goal" text,
	"notes" text,
	"next_follow_up_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"attendance_status" text DEFAULT 'scheduled' NOT NULL,
	"post_lesson_note" text,
	"recommendation" text,
	"booking_confirmed_at" timestamp with time zone,
	"reminder24h_sent_at" timestamp with time zone,
	"reminder15m_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"teacher_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "lesson_status" DEFAULT 'scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"max_students" integer DEFAULT 8 NOT NULL,
	"jlpt_level" text,
	"recording_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personal_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"uploaded_by" text NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "homework" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"status" "homework_status" DEFAULT 'pending' NOT NULL,
	"marked_by" text,
	"marked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_submissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"content" text NOT NULL,
	"status" "homework_submission_status" DEFAULT 'submitted' NOT NULL,
	"ai_review" jsonb,
	"ai_reviewed_at" timestamp with time zone,
	"ai_review_error" text,
	"teacher_comment" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_totals" (
	"user_id" text PRIMARY KEY NOT NULL,
	"review_seconds" integer DEFAULT 0 NOT NULL,
	"kana_seconds" integer DEFAULT 0 NOT NULL,
	"kanji_seconds" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'yookassa' NOT NULL,
	"provider_payment_id" text,
	"idempotence_key" text NOT NULL,
	"plan_id" text NOT NULL,
	"amount_value" text NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"confirmation_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_access" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active_until" timestamp with time zone,
	"lesson_credits" integer DEFAULT 0 NOT NULL,
	"trial_used" boolean DEFAULT false NOT NULL,
	"assigned_plan_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text,
	"event" text NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_trial_lesson_id_lessons_id_fk" FOREIGN KEY ("trial_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_events" ADD CONSTRAINT "personal_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_materials" ADD CONSTRAINT "lesson_materials_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_materials" ADD CONSTRAINT "lesson_materials_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_lesson_card_id_lesson_cards_id_fk" FOREIGN KEY ("lesson_card_id") REFERENCES "public"."lesson_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_cards" ADD CONSTRAINT "lesson_cards_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_marked_by_user_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_totals" ADD CONSTRAINT "training_totals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_access" ADD CONSTRAINT "student_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_lesson_student_uniq" ON "bookings" USING btree ("lesson_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_user_lesson_card_uniq" ON "flashcards" USING btree ("user_id","lesson_card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_lesson_student_uniq" ON "homework" USING btree ("lesson_id","student_id");--> statement-breakpoint
CREATE INDEX "homework_submissions_lesson_student_idx" ON "homework_submissions" USING btree ("lesson_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_id_uniq" ON "payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotence_key_uniq" ON "payments" USING btree ("idempotence_key");