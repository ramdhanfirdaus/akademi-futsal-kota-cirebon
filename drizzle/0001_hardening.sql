ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_unique" UNIQUE("user_id");