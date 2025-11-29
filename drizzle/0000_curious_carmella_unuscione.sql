CREATE TYPE "public"."queue_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('thumbnail', 'sprite', 'vtt');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('like', 'dislike');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('underage_content', 'abuse', 'illegal_content', 'wrong_tags', 'spam_unrelated', 'dmca', 'other');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_follow" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"aliases" text[] NOT NULL,
	"image" text,
	"birthday" date,
	CONSTRAINT "creator_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "creator_link" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"link" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcode_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"input_key" text NOT NULL,
	"output_prefix" text NOT NULL,
	"status" "queue_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video" (
	"id" text PRIMARY KEY NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"original_key" text NOT NULL,
	"original_thumbnail_key" text,
	"status" "video_status" DEFAULT 'in_review' NOT NULL,
	"rejection_message" text,
	"duration_seconds" integer,
	"size_bytes" bigint,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "video_category" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"category_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_featured_creator" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"creator_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"fingerprint_id" text,
	"video_id" text NOT NULL,
	"reaction_type" "reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_reaction_identity_check" CHECK ("video_reaction"."user_id" IS NOT NULL OR "video_reaction"."fingerprint_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "video_report" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"reported_by_id" text,
	"fingerprint_id" text,
	"reasons" "report_reason"[] NOT NULL,
	"details" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_view" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"fingerprint_id" text,
	"video_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_view_identity_check" CHECK ("video_view"."user_id" IS NOT NULL OR "video_view"."fingerprint_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_link" ADD CONSTRAINT "creator_link_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcode_queue" ADD CONSTRAINT "transcode_queue_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_category" ADD CONSTRAINT "video_category_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_category" ADD CONSTRAINT "video_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_featured_creator" ADD CONSTRAINT "video_featured_creator_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_featured_creator" ADD CONSTRAINT "video_featured_creator_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_reaction" ADD CONSTRAINT "video_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_reaction" ADD CONSTRAINT "video_reaction_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_report" ADD CONSTRAINT "video_report_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_report" ADD CONSTRAINT "video_report_reported_by_id_user_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tag" ADD CONSTRAINT "video_tag_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tag" ADD CONSTRAINT "video_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_view" ADD CONSTRAINT "video_view_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_view" ADD CONSTRAINT "video_view_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_follow_follower_idx" ON "user_follow" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "user_follow_following_idx" ON "user_follow" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "transcode_queue_video_idx" ON "transcode_queue" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "transcode_queue_status_idx" ON "transcode_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transcode_queue_created_idx" ON "transcode_queue" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "video_reaction_user_video_unique" ON "video_reaction" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_reaction_fingerprint_video_unique" ON "video_reaction" USING btree ("fingerprint_id","video_id");