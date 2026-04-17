CREATE TABLE "lesson_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_materials" ADD CONSTRAINT "lesson_materials_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_materials" ADD CONSTRAINT "lesson_materials_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;