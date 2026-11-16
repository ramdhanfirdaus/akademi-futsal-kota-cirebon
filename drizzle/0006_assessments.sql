CREATE TYPE "public"."assessment_track" AS ENUM('PLAYER', 'GOALKEEPER');--> statement-breakpoint
CREATE TYPE "public"."semester_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "assessment_aspects" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"track" "assessment_track" NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "assessment_aspects_order" UNIQUE("semester_id","track","sort_order")
);
--> statement-breakpoint
CREATE TABLE "assessment_semesters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"number_format" varchar(255) NOT NULL,
	"certificate_date" date,
	"status" "semester_status" DEFAULT 'DRAFT' NOT NULL,
	"first_published_at" timestamp,
	"published_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_templates" (
	"semester_id" integer NOT NULL,
	"track" "assessment_track" NOT NULL,
	"image" "bytea" NOT NULL,
	"image_type" varchar(32) NOT NULL,
	"width_px" integer NOT NULL,
	"height_px" integer NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_templates_semester_id_track_pk" PRIMARY KEY("semester_id","track")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"track" "assessment_track" NOT NULL,
	"class_id" integer NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"certificate_seq" integer,
	"graded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_semester_student_track" UNIQUE("semester_id","student_id","track"),
	CONSTRAINT "assessments_semester_seq" UNIQUE("semester_id","certificate_seq")
);
--> statement-breakpoint
ALTER TABLE "assessment_aspects" ADD CONSTRAINT "assessment_aspects_semester_id_assessment_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."assessment_semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_semester_id_assessment_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."assessment_semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_semester_id_assessment_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."assessment_semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_semesters_name" ON "assessment_semesters" USING btree ("name") WHERE "assessment_semesters"."deleted_at" is null;