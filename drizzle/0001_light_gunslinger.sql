CREATE TYPE "public"."creator_role" AS ENUM('performer', 'producer');--> statement-breakpoint
CREATE TYPE "public"."hls_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
ALTER TABLE "video_featured_creator" RENAME TO "video_creator";--> statement-breakpoint
ALTER TABLE "video" DROP CONSTRAINT "video_creator_id_creator_id_fk";
--> statement-breakpoint
ALTER TABLE "video_creator" DROP CONSTRAINT "video_featured_creator_video_id_video_id_fk";
--> statement-breakpoint
ALTER TABLE "video_creator" DROP CONSTRAINT "video_featured_creator_creator_id_creator_id_fk";
--> statement-breakpoint
ALTER TABLE "video" ADD COLUMN "hls_status" "hls_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_creator" ADD COLUMN "role" "creator_role" DEFAULT 'performer' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_creator" ADD CONSTRAINT "video_creator_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_creator" ADD CONSTRAINT "video_creator_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video" DROP COLUMN "creator_id";