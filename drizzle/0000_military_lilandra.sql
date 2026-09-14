CREATE TYPE "public"."grade_result" AS ENUM('CORRECT', 'INCORRECT', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."jlpt_level" AS ENUM('N5', 'N4', 'N3', 'N2', 'N1');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('ACTIVE', 'COMPLETED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "achievements_unlocked" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"meta_json" text,
	"is_anomalous" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_explanation_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_explanation_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "jlpt_level" NOT NULL,
	"kanji" text,
	"hiragana" text NOT NULL,
	"romaji" text NOT NULL,
	"meaning_id" text NOT NULL,
	"meaning_en" text NOT NULL,
	"example_jp" text,
	"example_id" text,
	"example_en" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"target_level" "jlpt_level" DEFAULT 'N5' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"flashcard_id" uuid,
	"source_mode" text DEFAULT 'FLASHCARD' NOT NULL,
	"vocab_key" text,
	"user_answer" text NOT NULL,
	"result" "grade_result" NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"level" "jlpt_level" NOT NULL,
	"status" "session_status" DEFAULT 'ACTIVE' NOT NULL,
	"total_cards" integer NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"incorrect_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "achievements_unlocked" ADD CONSTRAINT "achievements_unlocked_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_results" ADD CONSTRAINT "study_results_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_results" ADD CONSTRAINT "study_results_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_results" ADD CONSTRAINT "study_results_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_achievement" ON "achievements_unlocked" USING btree ("user_id","achievement_id");