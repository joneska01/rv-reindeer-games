CREATE TYPE "public"."display_mode" AS ENUM('scoreboard', 'podium', 'final_results');--> statement-breakpoint
CREATE TYPE "public"."podium_state" AS ENUM('hidden', 'show_third', 'show_second', 'show_first', 'show_all');--> statement-breakpoint
CREATE TYPE "public"."round_combine_method" AS ENUM('sum', 'average');--> statement-breakpoint
CREATE TYPE "public"."score_source" AS ENUM('manual', 'voting');--> statement-breakpoint
CREATE TYPE "public"."score_type" AS ENUM('high_wins', 'low_wins');--> statement-breakpoint
CREATE TABLE "costume_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"voting_team_id" uuid NOT NULL,
	"first_place_team_id" uuid NOT NULL,
	"second_place_team_id" uuid NOT NULL,
	"third_place_team_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "costume_votes_year_team_unique" UNIQUE("year_id","voting_team_id")
);
--> statement-breakpoint
CREATE TABLE "game_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"scoring_description" text DEFAULT '' NOT NULL,
	"score_type" "score_type" DEFAULT 'high_wins' NOT NULL,
	"score_source" "score_source" DEFAULT 'manual' NOT NULL,
	"score_unit" text DEFAULT 'points' NOT NULL,
	"default_num_rounds" integer DEFAULT 1 NOT NULL,
	"supplies" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"library_game_id" uuid,
	"name" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"scoring_description" text DEFAULT '' NOT NULL,
	"score_type" "score_type" DEFAULT 'high_wins' NOT NULL,
	"score_source" "score_source" DEFAULT 'manual' NOT NULL,
	"score_unit" text DEFAULT 'points' NOT NULL,
	"num_rounds" integer DEFAULT 1 NOT NULL,
	"round_combine_method" "round_combine_method" DEFAULT 'sum' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_fouls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"year_id" uuid NOT NULL,
	"description" text,
	"assessed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"raw_score" numeric(10, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scores_game_team_round_unique" UNIQUE("game_id","team_id","round")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_color" text DEFAULT '#C41E3A' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_year_name_unique" UNIQUE("year_id","name")
);
--> statement-breakpoint
CREATE TABLE "years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"active_game_id" uuid,
	"display_mode" "display_mode" DEFAULT 'scoreboard' NOT NULL,
	"podium_state" "podium_state" DEFAULT 'hidden' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "years_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "costume_votes" ADD CONSTRAINT "costume_votes_year_id_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costume_votes" ADD CONSTRAINT "costume_votes_voting_team_id_teams_id_fk" FOREIGN KEY ("voting_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costume_votes" ADD CONSTRAINT "costume_votes_first_place_team_id_teams_id_fk" FOREIGN KEY ("first_place_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costume_votes" ADD CONSTRAINT "costume_votes_second_place_team_id_teams_id_fk" FOREIGN KEY ("second_place_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costume_votes" ADD CONSTRAINT "costume_votes_third_place_team_id_teams_id_fk" FOREIGN KEY ("third_place_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_year_id_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_library_game_id_game_library_id_fk" FOREIGN KEY ("library_game_id") REFERENCES "public"."game_library"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_fouls" ADD CONSTRAINT "party_fouls_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_fouls" ADD CONSTRAINT "party_fouls_year_id_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_year_id_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_year_sort_idx" ON "games" USING btree ("year_id","sort_order");--> statement-breakpoint
CREATE INDEX "party_fouls_team_year_idx" ON "party_fouls" USING btree ("team_id","year_id");