CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anonymous_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"props" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_events_name_created_idx" ON "funnel_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "funnel_events_anonymous_idx" ON "funnel_events" USING btree ("anonymous_id");