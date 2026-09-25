CREATE TABLE "study_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"new_cards_per_day" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_settings" ADD CONSTRAINT "study_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;