CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'canceled');--> statement-breakpoint
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_access" ADD CONSTRAINT "student_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_id_uniq" ON "payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotence_key_uniq" ON "payments" USING btree ("idempotence_key");