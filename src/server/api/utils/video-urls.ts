import { env } from "~/env";
import type * as schema from "~/server/db/schema";

type TranscodeQueue = typeof schema.transcodeQueue.$inferSelect;
type Video = typeof schema.video.$inferSelect;

export interface VideoWithUrls {
  hlsSource: string | null;
  hoverPreviewMp4: string | null;
  hoverPreviewWebm: string | null;
  thumbnailsVtt: string | null;
  thumbnail25pct: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}

/**
 * Builds URLs for video assets (HLS, previews, thumbnails) from transcode data
 */
export function buildVideoUrls(
  video: Video,
  transcode?: TranscodeQueue | null,
): VideoWithUrls {
  const hlsSource = transcode
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/master.m3u8`
    : null;

  const hoverPreviewMp4 = transcode
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/hover.mp4`
    : null;

  const hoverPreviewWebm = transcode
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/hover.webm`
    : null;

  const thumbnailsVtt = transcode
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/thumbnails.vtt`
    : null;

  const thumbnail25pct = transcode
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/thumb_25pct.jpg`
    : null;

  const thumbnailUrl = video.originalThumbnailKey
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${video.originalThumbnailKey}`
    : null;

  const videoUrl = video.originalKey
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${video.originalKey}`
    : null;

  return {
    hlsSource,
    hoverPreviewMp4,
    hoverPreviewWebm,
    thumbnailsVtt,
    thumbnail25pct,
    thumbnailUrl,
    videoUrl,
  };
}
