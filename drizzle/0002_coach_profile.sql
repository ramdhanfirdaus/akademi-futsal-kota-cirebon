ALTER TABLE "coaches" ADD COLUMN "experience" text;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "certifications" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "photo" "bytea";--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "photo_type" varchar(32);