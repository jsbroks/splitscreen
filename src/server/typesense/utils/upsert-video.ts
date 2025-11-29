/**
 * Utility to upsert a video document into Typesense
 */

import { and, count, db, eq, gte, isNull } from "~/server/db";
import * as schema from "~/server/db/schema";
import { typesense } from "../client";
import type { VideoV1 } from "../schemas/videos";
import {
  calculateEngagementRate,
  calculatePopularityScore,
  calculateTrendingScore,
} from "./video-scoring";

interface UpsertVideoOptions {
  /**
   * Whether to calculate scores (popularity, trending, engagement).
   * Set to false if you're doing bulk updates and will calculate scores separately.
   * @default true
   */
  calculateScores?: boolean;
}

/**
 * Upserts a single video document into Typesense
 * Fetches all related data from the database and syncs to Typesense
 */
export async function upsertVideoToTypesense(
  videoId: string,
  options: UpsertVideoOptions = {},
): Promise<VideoV1 | null> {
  const { calculateScores = true } = options;

  // Fetch video with all relations
  const video = await db.query.video.findFirst({
    where: and(eq(schema.video.id, videoId), isNull(schema.video.deletedAt)),
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
      creators: {
        with: {
          creator: true,
        },
      },
    },
  });

  if (!video) {
    console.warn(`Video ${videoId} not found, skipping Typesense upsert`);
    return null;
  }

  // Skip if video is deleted
  if (video.deletedAt) {
    console.warn(
      `Video ${videoId} is deleted, skipping Typesense upsert (or use deleteVideoFromTypesense)`,
    );
    return null;
  }

  // Get total view count
  // Total = denormalized count (archived/compressed views) + current views in table
  const baseViewCount = video.viewCount ?? 0;
  const viewCountResult = await db
    .select({ count: count() })
    .from(schema.videoView)
    .where(eq(schema.videoView.videoId, videoId));
  const currentViewCount = viewCountResult[0]?.count ?? 0;
  const viewCount = baseViewCount + currentViewCount;

  // Get like/dislike counts
  const likeCountResult = await db
    .select({ count: count() })
    .from(schema.videoReaction)
    .where(
      and(
        eq(schema.videoReaction.videoId, videoId),
        eq(schema.videoReaction.reactionType, "like"),
      ),
    );
  const likeCount = likeCountResult[0]?.count ?? 0;

  const dislikeCountResult = await db
    .select({ count: count() })
    .from(schema.videoReaction)
    .where(
      and(
        eq(schema.videoReaction.videoId, videoId),
        eq(schema.videoReaction.reactionType, "dislike"),
      ),
    );
  const dislikeCount = dislikeCountResult[0]?.count ?? 0;

  // Get uploader information
  const uploader = await db.query.user.findFirst({
    where: eq(schema.user.id, video.uploadedById),
  });

  // Get transcode status
  const latestTranscode = await db.query.transcodeQueue.findFirst({
    where: eq(schema.transcodeQueue.videoId, videoId),
    orderBy: (queue, { desc }) => [desc(queue.createdAt)],
  });

  // Get report metrics
  const reportCountResult = await db
    .select({ count: count() })
    .from(schema.videoReport)
    .where(eq(schema.videoReport.videoId, videoId));
  const reportCount = reportCountResult[0]?.count ?? 0;

  const activeReportsResult = await db
    .select({ count: count() })
    .from(schema.videoReport)
    .where(
      and(
        eq(schema.videoReport.videoId, videoId),
        eq(schema.videoReport.archived, false),
      ),
    );
  const hasActiveReports = (activeReportsResult[0]?.count ?? 0) > 0;

  // Get time-windowed metrics (last 24h and 7d)
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Views last 24h
  const viewsLast24hResult = await db
    .select({ count: count() })
    .from(schema.videoView)
    .where(
      and(
        eq(schema.videoView.videoId, videoId),
        gte(schema.videoView.createdAt, twentyFourHoursAgo),
      ),
    );
  const viewsLast24h = viewsLast24hResult[0]?.count ?? 0;

  // Views last 7d
  const viewsLast7dResult = await db
    .select({ count: count() })
    .from(schema.videoView)
    .where(
      and(
        eq(schema.videoView.videoId, videoId),
        gte(schema.videoView.createdAt, sevenDaysAgo),
      ),
    );
  const viewsLast7d = viewsLast7dResult[0]?.count ?? 0;

  // Likes last 24h
  const likesLast24hResult = await db
    .select({ count: count() })
    .from(schema.videoReaction)
    .where(
      and(
        eq(schema.videoReaction.videoId, videoId),
        eq(schema.videoReaction.reactionType, "like"),
        gte(schema.videoReaction.createdAt, twentyFourHoursAgo),
      ),
    );
  const likesLast24h = likesLast24hResult[0]?.count ?? 0;

  // Likes last 7d
  const likesLast7dResult = await db
    .select({ count: count() })
    .from(schema.videoReaction)
    .where(
      and(
        eq(schema.videoReaction.videoId, videoId),
        eq(schema.videoReaction.reactionType, "like"),
        gte(schema.videoReaction.createdAt, sevenDaysAgo),
      ),
    );
  const likesLast7d = likesLast7dResult[0]?.count ?? 0;

  // Calculate scores if enabled
  let popularityScore: number | undefined;
  let trendingScore: number | undefined;
  let engagementRate: number | undefined;

  if (calculateScores) {
    popularityScore = calculatePopularityScore(
      viewCount,
      likeCount,
      dislikeCount,
    );
    trendingScore = calculateTrendingScore(
      viewsLast24h,
      viewsLast7d,
      viewCount,
      likesLast24h,
      likesLast7d,
      likeCount,
      video.createdAt,
    );
    engagementRate = calculateEngagementRate(likeCount, viewCount);
  }

  // Build Typesense document
  const typesenseDoc: VideoV1 = {
    id: video.id,
    title: video.title,
    description: video.description ?? undefined,

    // Featured creators
    featured_creator_ids: video.creators.map((fc) => fc.creator.id),
    featured_creator_usernames: video.creators.map((fc) => fc.creator.username),
    featured_creator_display_names: video.creators.map(
      (fc) => fc.creator.displayName,
    ),
    featured_creator_aliases: video.creators.flatMap(
      (fc) => fc.creator.aliases,
    ),

    // Tags
    tag_ids: video.tags.map((vt) => vt.tag.id),
    tag_names: video.tags.map((vt) => vt.tag.name),
    tag_slugs: video.tags.map((vt) => vt.tag.slug),

    // Uploader information
    uploaded_by_id: video.uploadedById,
    uploaded_by_username: uploader?.username ?? undefined,

    // Video metadata
    duration_seconds: video.durationSeconds ?? undefined,
    status: video.status,

    // Video dimensions (TODO: Add width/height fields to video table if needed)
    width: undefined,
    height: undefined,

    // Processing/Quality flags
    has_thumbnail: video.originalThumbnailKey ? true : undefined,
    is_transcoded: latestTranscode?.status === "done",
    transcode_status: latestTranscode?.status ?? undefined,

    // Report/Moderation metrics
    report_count: reportCount,
    has_active_reports: hasActiveReports,

    // Engagement metrics
    view_count: viewCount,
    like_count: likeCount,
    dislike_count: dislikeCount,

    // Calculated scores
    popularity_score: popularityScore,
    trending_score: trendingScore,
    engagement_rate: engagementRate,

    // Time-windowed metrics
    views_last_24h: viewsLast24h,
    views_last_7d: viewsLast7d,
    likes_last_24h: likesLast24h,
    likes_last_7d: likesLast7d,

    // Timestamps (convert to Unix timestamp)
    created_at: Math.floor(video.createdAt.getTime() / 1000),
    updated_at: Math.floor(video.updatedAt.getTime() / 1000),
  };

  // Upsert to Typesense
  try {
    await typesense.collections("video_v1").documents().upsert(typesenseDoc);
    console.log(`✅ Upserted video ${videoId} to Typesense`);
    return typesenseDoc;
  } catch (error) {
    console.error(`❌ Failed to upsert video ${videoId} to Typesense:`, error);
    throw error;
  }
}

/**
 * Deletes a video document from Typesense
 */
export async function deleteVideoFromTypesense(videoId: string): Promise<void> {
  try {
    await typesense.collections("video_v1").documents(videoId).delete();
    console.log(`✅ Deleted video ${videoId} from Typesense`);
  } catch (error) {
    // Ignore 404 errors (document doesn't exist)
    if (
      error &&
      typeof error === "object" &&
      "httpStatus" in error &&
      error.httpStatus === 404
    ) {
      console.log(`Video ${videoId} not found in Typesense, nothing to delete`);
      return;
    }
    console.error(
      `❌ Failed to delete video ${videoId} from Typesense:`,
      error,
    );
    throw error;
  }
}

/**
 * Bulk upsert multiple videos to Typesense
 * More efficient for syncing large numbers of videos
 */
export async function bulkUpsertVideosToTypesense(
  videoIds: string[],
  options: UpsertVideoOptions = {},
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ videoId: string; error: unknown }>;
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ videoId: string; error: unknown }>,
  };

  console.log(`Starting bulk upsert of ${videoIds.length} videos...`);

  // Process in batches of 10 to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (videoId) => {
        try {
          await upsertVideoToTypesense(videoId, options);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({ videoId, error });
        }
      }),
    );

    console.log(
      `Processed ${Math.min(i + batchSize, videoIds.length)}/${videoIds.length} videos`,
    );
  }

  console.log(
    `✅ Bulk upsert complete: ${results.successful} successful, ${results.failed} failed`,
  );

  return results;
}

/**
 * Sync all approved videos to Typesense
 * Useful for initial setup or full resync
 */
export async function syncAllVideosToTypesense(
  options: UpsertVideoOptions = {},
): Promise<void> {
  console.log("🔄 Starting full sync of videos to Typesense...");

  // Get all non-deleted video IDs
  const videos = await db.query.video.findMany({
    where: isNull(schema.video.deletedAt),
    columns: {
      id: true,
    },
  });

  const videoIds = videos.map((v) => v.id);
  console.log(`Found ${videoIds.length} videos to sync`);

  const results = await bulkUpsertVideosToTypesense(videoIds, options);

  if (results.failed > 0) {
    console.error("❌ Some videos failed to sync:");
    for (const error of results.errors) {
      console.error(`  - ${error.videoId}:`, error.error);
    }
  }

  console.log("✅ Full sync complete!");
}
