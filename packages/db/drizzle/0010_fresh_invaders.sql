ALTER TABLE "user" ADD COLUMN "telegram_username" text;--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "telegram_id";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_telegramUsername_unique" UNIQUE("telegram_username");