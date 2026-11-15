CREATE TABLE "gallery_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"caption" varchar(255),
	"photo" "bytea" NOT NULL,
	"photo_type" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
