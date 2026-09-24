CREATE TABLE "fsrs_params" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"w_json" text NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fsrs_params" ADD CONSTRAINT "fsrs_params_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;