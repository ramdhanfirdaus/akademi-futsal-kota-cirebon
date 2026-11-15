ALTER TABLE "academy_students" ADD COLUMN "fee_start" date DEFAULT (date_trunc('month', now() at time zone 'Asia/Jakarta'))::date NOT NULL;--> statement-breakpoint
-- Existing students: fees start in the month they were registered (WIB), not the migration month.
UPDATE "academy_students" AS a SET "fee_start" = (date_trunc('month', (s."created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::date FROM "students" AS s WHERE s."id" = a."student_id";
