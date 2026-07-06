ALTER TABLE "leads" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "trial_lesson_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendance_status" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "post_lesson_note" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "recommendation" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "booking_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder24h_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder15m_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_trial_lesson_id_lessons_id_fk" FOREIGN KEY ("trial_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;