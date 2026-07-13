ALTER TABLE "user" ADD COLUMN "personal_data_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "personal_data_consent_version" text;