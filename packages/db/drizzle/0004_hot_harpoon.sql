CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"contact" text,
	"level" text,
	"goal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
