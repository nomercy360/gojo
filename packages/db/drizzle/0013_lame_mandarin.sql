ALTER TABLE "public"."user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
UPDATE "public"."user" SET "role" = 'admin' WHERE "role" = 'teacher';--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin');--> statement-breakpoint
ALTER TABLE "public"."user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";