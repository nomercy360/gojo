ALTER TABLE "user" ADD COLUMN "source_lead_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "student_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "telegram_id" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_source_lead_id_uniq" ON "user" USING btree ("source_lead_id");