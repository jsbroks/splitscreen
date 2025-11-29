/**
 * Utility to map Typesense search results to enriched video objects from the database
 */

import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import { and, asc, count, type db, inArray } from "~/server/db";
import * as schema from "~/server/db/schema";
import { buildVideoUrls } from "../../api/utils/video-urls";
import type { VideoV1 } from "../schemas/videos";

export interface MapSearchResultsOptions {
  /** Database instance from tRPC context */
  db: typeof db;
  /** Typesense search response */
  searchResponse: SearchResponse<VideoV1>;
  /** Optional filter function to exclude video IDs (e.g., to exclude source video) */
  filterVideoIds?: (videoId: string) => boolean;
}

export type EnrichedVideo = typeof schema.video.$inferSelect & {
  thumbnailUrl: string | null;
  videoUrl: string | null;
  uploadedBy: typeof schema.user.$inferSelect;
  transcode: Partial<typeof schema.transcodeQueue.$inferSelect> & {
    hlsSource: string | null;
    hoverPreviewMp4: string | null;
    hoverPreviewWebm: string | null;
    thumbnailsVtt: string | null;
    thumbnail25pct: string | null;
  };
  views: number;
  featuredCreators: (typeof schema.creator.$inferSelect)[];
  tags: (typeof schema.tag.$inferSelect)[];
};

/**
 * Maps Typesense search results to enriched video objects with database data
 * Maintains the order of the search results
 *
 * @example
 * ```ts
 * const results = await typesense
 *   .collections<VideoV1>("video_v1")
 *   .documents()
 *   .search(query);
 *
 * const videos = await mapSearchResultsToVideos({
 *   db: ctx.db,
 *   searchResponse: results,
 *   filterVideoIds: (id) => id !== sourceVideoId,
 *   limit: 12,
 * });
 * ```
 */
export async function mapSearchResultsToVideos(
  options: MapSearchResultsOptions,
): Promise<EnrichedVideo[]> {
  const { db, searchResponse, filterVideoIds } = options;

  // Extract video IDs from search results
  let videoIds =
    searchResponse.hits?.map((hit) => hit.document.id).filter(Boolean) ?? [];

  // Apply filter if provided
  if (filterVideoIds) {
    videoIds = videoIds.filter(filterVideoIds);
  }

  if (videoIds.length === 0) {
    return [];
  }

  // Build WHERE conditions
  const whereConditions = [inArray(schema.video.id, videoIds)];

  // Fetch videos from database with all relations
  const videos = await db.query.video.findMany({
    where: and(...whereConditions),
    with: {
      transcodeQueue: {
        orderBy: [asc(schema.transcodeQueue.createdAt)],
      },
      uploadedBy: true,
      tags: {
        with: {
          tag: true,
        },
      },
      featuredCreators: {
        with: {
          creator: true,
        },
      },
    },
  });

  // Get view counts for all videos
  // Total = denormalized count (archived/compressed views) + current views in table
  const viewCountMap = new Map<string, number>();

  // First, initialize with denormalized counts (or 0)
  for (const video of videos) {
    viewCountMap.set(video.id, video.viewCount ?? 0);
  }

  // Then add current counts from videoView table
  const viewCounts = await db
    .select({
      videoId: schema.videoView.videoId,
      count: count(),
    })
    .from(schema.videoView)
    .where(inArray(schema.videoView.videoId, videoIds))
    .groupBy(schema.videoView.videoId);

  for (const vc of viewCounts) {
    const baseCount = viewCountMap.get(vc.videoId) ?? 0;
    viewCountMap.set(vc.videoId, baseCount + vc.count);
  }

  // Create a map for quick lookup
  const videoMap = new Map(videos.map((v) => [v.id, v]));

  // Return videos in the same order as Typesense results
  return videoIds
    .map((id) => {
      const video = videoMap.get(id);
      if (!video) return null;

      const transcode = video.transcodeQueue[0];
      const urls = buildVideoUrls(video, transcode);

      return {
        ...video,
        thumbnailUrl: urls.thumbnailUrl,
        videoUrl: urls.videoUrl,
        uploadedBy: video.uploadedBy,
        featuredCreators: video.featuredCreators.map((fc) => fc.creator),
        tags: video.tags.map((vt) => vt.tag),
        transcode: {
          ...(transcode ?? {}),
          hlsSource: urls.hlsSource,
          hoverPreviewMp4: urls.hoverPreviewMp4,
          hoverPreviewWebm: urls.hoverPreviewWebm,
          thumbnailsVtt: urls.thumbnailsVtt,
          thumbnail25pct: urls.thumbnail25pct,
        },
        views: viewCountMap.get(id) ?? 0,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
}

/**
 * Simpler version that just extracts video IDs from search results
 * Useful when you need the IDs for further processing
 */
export function extractVideoIds(
  searchResponse: SearchResponse<VideoV1>,
  options?: {
    filterVideoIds?: (videoId: string) => boolean;
    limit?: number;
  },
): string[] {
  let videoIds =
    searchResponse.hits?.map((hit) => hit.document.id).filter(Boolean) ?? [];

  if (options?.filterVideoIds) {
    videoIds = videoIds.filter(options.filterVideoIds);
  }

  if (options?.limit) {
    videoIds = videoIds.slice(0, options.limit);
  }

  return videoIds;
}
