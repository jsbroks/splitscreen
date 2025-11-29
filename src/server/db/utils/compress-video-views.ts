/**
 * Utility functions to compress the videoView table by moving old views
 * to the denormalized viewCount column in the video table.
 *
 * This helps manage database size while maintaining accurate view counts.
 */

import { and, count, db, eq, inArray, lt, sql } from "..";
import * as schema from "../schema";

export interface CompressViewsOptions {
  /**
   * Only compress views older than this date
   * @default 30 days ago
   */
  olderThan?: Date;

  /**
   * Process videos in batches of this size
   * @default 100
   */
  batchSize?: number;

  /**
   * Optional video IDs to compress. If not provided, all videos will be processed.
   */
  videoIds?: string[];
}

/**
 * Compresses old views from the videoView table into the denormalized viewCount column.
 * Deletes the compressed view records after updating the count.
 *
 * @example
 * // Compress views older than 30 days for all videos
 * await compressOldVideoViews();
 *
 * @example
 * // Compress views older than 90 days
 * const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
 * await compressOldVideoViews({ olderThan: ninetyDaysAgo });
 *
 * @example
 * // Compress views for specific videos
 * await compressOldVideoViews({ videoIds: ['video1', 'video2'] });
 */
export async function compressOldVideoViews(
  options: CompressViewsOptions = {},
): Promise<{
  videosProcessed: number;
  viewsCompressed: number;
  errors: Array<{ videoId: string; error: unknown }>;
}> {
  const {
    olderThan = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    batchSize = 100,
    videoIds,
  } = options;

  const results = {
    videosProcessed: 0,
    viewsCompressed: 0,
    errors: [] as Array<{ videoId: string; error: unknown }>,
  };

  console.log(
    `🗜️  Starting view compression for views older than ${olderThan.toISOString()}`,
  );

  // Get videos that have old views to compress
  const whereConditions = videoIds
    ? [
        lt(schema.videoView.createdAt, olderThan),
        inArray(schema.videoView.videoId, videoIds),
      ]
    : [lt(schema.videoView.createdAt, olderThan)];

  const videosWithOldViews = await db
    .selectDistinct({ videoId: schema.videoView.videoId })
    .from(schema.videoView)
    .where(and(...whereConditions));

  const videoIdsToProcess = videosWithOldViews.map(
    (v: { videoId: string }) => v.videoId,
  );

  console.log(
    `Found ${videoIdsToProcess.length} videos with old views to compress`,
  );

  // Process videos in batches
  for (let i = 0; i < videoIdsToProcess.length; i += batchSize) {
    const batch = videoIdsToProcess.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (videoId: string) => {
        try {
          await compressViewsForVideo(videoId, olderThan);
          results.videosProcessed++;
        } catch (error) {
          results.errors.push({ videoId, error });
          console.error(
            `❌ Failed to compress views for video ${videoId}:`,
            error,
          );
        }
      }),
    );

    console.log(
      `Processed ${Math.min(i + batchSize, videoIdsToProcess.length)}/${videoIdsToProcess.length} videos`,
    );
  }

  // Get total views compressed
  const viewsRemaining = await db
    .select({ count: count() })
    .from(schema.videoView)
    .then((r) => r[0]?.count ?? 0);

  console.log(
    `✅ Compression complete: ${results.videosProcessed} videos processed`,
  );
  console.log(`   Views remaining in table: ${viewsRemaining}`);

  return results;
}

/**
 * Compresses views for a single video
 * @internal
 */
async function compressViewsForVideo(
  videoId: string,
  olderThan: Date,
): Promise<void> {
  // Start a transaction
  await db.transaction(async (tx) => {
    // Count old views for this video
    const oldViewsResult = await tx
      .select({ count: count() })
      .from(schema.videoView)
      .where(
        and(
          eq(schema.videoView.videoId, videoId),
          lt(schema.videoView.createdAt, olderThan),
        ),
      );

    const oldViewsCount = oldViewsResult[0]?.count ?? 0;

    if (oldViewsCount === 0) {
      return; // Nothing to compress
    }

    // Update the denormalized count
    await tx
      .update(schema.video)
      .set({
        viewCount: sql`COALESCE(${schema.video.viewCount}, 0) + ${oldViewsCount}`,
      })
      .where(eq(schema.video.id, videoId));

    // Delete the old views
    await tx
      .delete(schema.videoView)
      .where(
        and(
          eq(schema.videoView.videoId, videoId),
          lt(schema.videoView.createdAt, olderThan),
        ),
      );

    console.log(`  ✓ Compressed ${oldViewsCount} views for video ${videoId}`);
  });
}

/**
 * Get statistics about the videoView table and potential compression savings
 */
export async function getViewCompressionStats(
  olderThan: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
): Promise<{
  totalViews: number;
  oldViews: number;
  recentViews: number;
  videosWithOldViews: number;
  potentialSavings: string;
}> {
  const totalViewsResult = await db
    .select({ count: count() })
    .from(schema.videoView);
  const totalViews = totalViewsResult[0]?.count ?? 0;

  const oldViewsResult = await db
    .select({ count: count() })
    .from(schema.videoView)
    .where(lt(schema.videoView.createdAt, olderThan));
  const oldViews = oldViewsResult[0]?.count ?? 0;

  const videosWithOldViewsResult = await db
    .selectDistinct({ videoId: schema.videoView.videoId })
    .from(schema.videoView)
    .where(lt(schema.videoView.createdAt, olderThan));
  const videosWithOldViews = videosWithOldViewsResult.length;

  const recentViews = totalViews - oldViews;
  const potentialSavings = `${((oldViews / totalViews) * 100).toFixed(1)}%`;

  return {
    totalViews,
    oldViews,
    recentViews,
    videosWithOldViews,
    potentialSavings,
  };
}
