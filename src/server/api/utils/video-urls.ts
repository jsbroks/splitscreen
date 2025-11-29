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
  const basePath = env.S3_PUBLIC_URL_BASE ?? env.S3_ENDPOINT;
  const bucket = env.S3_BUCKET;
  const baseUrl = env.S3_FORCE_PATH_STYLE
    ? `${basePath}/${bucket}`
    : `${basePath}`;
  const hlsSource = transcode
    ? `${baseUrl}/${transcode.outputPrefix}/master.m3u8`
    : null;

  const hoverPreviewMp4 = transcode
    ? `${baseUrl}/${transcode.outputPrefix}/hover.mp4`
    : null;

  const hoverPreviewWebm = transcode
    ? `${baseUrl}/${transcode.outputPrefix}/hover.webm`
    : null;

  const thumbnailsVtt = transcode
    ? `${baseUrl}/${transcode.outputPrefix}/thumbnails.vtt`
    : null;

  const thumbnail25pct = transcode
    ? `${baseUrl}/${transcode.outputPrefix}/thumb_25pct.jpg`
    : null;

  const thumbnailUrl = video.originalThumbnailKey
    ? `${baseUrl}/${video.originalThumbnailKey}`
    : null;

  const videoUrl = video.originalKey ? `${baseUrl}/${video.originalKey}` : null;

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
