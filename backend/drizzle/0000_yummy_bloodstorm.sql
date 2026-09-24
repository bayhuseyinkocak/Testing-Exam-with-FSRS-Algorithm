CREATE TYPE "public"."question_type" AS ENUM('single', 'multiple', 'true_false', 'fill_blank');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "blanks" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"position" integer NOT NULL,
	"options_json" text NOT NULL,
	"correct_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	CONSTRAINT "exams_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"topic_id" integer,
	"type" "question_type" NOT NULL,
	"question_text" text NOT NULL,
	"explanation" text,
	"translation" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"rating" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"selected_options" text,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"new_interval" double precision,
	"new_stability" double precision
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"statement_text" text NOT NULL,
	"correct_value" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_question_fsrs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" double precision DEFAULT 0 NOT NULL,
	"scheduled_days" double precision DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "blanks" ADD CONSTRAINT "blanks_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_fsrs" ADD CONSTRAINT "user_question_fsrs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_fsrs" ADD CONSTRAINT "user_question_fsrs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_question" ON "user_question_fsrs" USING btree ("user_id","question_id");