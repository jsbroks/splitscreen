CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
ALTER TABLE "transcode_queue" ADD COLUMN "hls_status" "processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "transcode_queue" ADD COLUMN "poster_status" "processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "transcode_queue" ADD COLUMN "scrubber_preview_status" "processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "transcode_queue" ADD COLUMN "hover_preview_status" "processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "video" DROP COLUMN "hls_status";--> statement-breakpoint
DROP TYPE "public"."hls_status";