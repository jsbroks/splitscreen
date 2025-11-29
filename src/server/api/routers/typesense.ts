import { z } from "zod";
import {
  bulkUpsertVideosToTypesense,
  deleteVideoFromTypesense,
  syncAllVideosToTypesense,
  upsertVideoToTypesense,
} from "~/server/typesense/utils";
import { adminProcedure, createTRPCRouter } from "../trpc";

/**
 * Router for Typesense operations (admin only)
 */
export const typesenseRouter = createTRPCRouter({
  /**
   * Sync all videos to Typesense
   */
  syncAll: adminProcedure.mutation(async () => {
    await syncAllVideosToTypesense({ calculateScores: true });
    return { success: true, message: "All videos synced to Typesense" };
  }),

  /**
   * Sync a single video to Typesense
   */
  syncVideo: adminProcedure
    .input(
      z.object({
        videoId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await upsertVideoToTypesense(input.videoId, {
        calculateScores: true,
      });

      if (!result) {
        return {
          success: false,
          message: `Video ${input.videoId} not found or failed to sync`,
        };
      }

      return {
        success: true,
        message: `Video ${input.videoId} synced successfully`,
      };
    }),

  /**
   * Sync multiple videos to Typesense
   */
  syncMultiple: adminProcedure
    .input(
      z.object({
        videoIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const results = await bulkUpsertVideosToTypesense(input.videoIds, {
        calculateScores: true,
      });

      return {
        success: true,
        message: `Synced ${results.successful} videos, ${results.failed} failed`,
        details: results,
      };
    }),

  /**
   * Delete a video from Typesense
   */
  deleteVideo: adminProcedure
    .input(
      z.object({
        videoId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await deleteVideoFromTypesense(input.videoId);

      return {
        success: true,
        message: `Video ${input.videoId} deleted from Typesense`,
      };
    }),

  /**
   * Sync videos updated in the last N hours
   */
  syncRecent: adminProcedure
    .input(
      z.object({
        hours: z.number().min(1).max(168).default(24), // 1 hour to 1 week
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const cutoffDate = new Date(Date.now() - input.hours * 60 * 60 * 1000);

      // Get videos updated since cutoff
      const videos = await ctx.db.query.video.findMany({
        where: (video, { gte, isNull, and }) =>
          and(gte(video.updatedAt, cutoffDate), isNull(video.deletedAt)),
        columns: {
          id: true,
        },
      });

      const videoIds = videos.map((v) => v.id);

      if (videoIds.length === 0) {
        return {
          success: true,
          message: `No videos updated in the last ${input.hours} hours`,
          details: { successful: 0, failed: 0, errors: [] },
        };
      }

      const results = await bulkUpsertVideosToTypesense(videoIds, {
        calculateScores: true,
      });

      return {
        success: true,
        message: `Synced ${results.successful} of ${videoIds.length} recently updated videos`,
        details: results,
      };
    }),

  /**
   * Sync only approved videos
   */
  syncApproved: adminProcedure.mutation(async ({ ctx }) => {
    // Get all approved videos
    const videos = await ctx.db.query.video.findMany({
      where: (video, { and, eq, isNull }) =>
        and(eq(video.status, "approved"), isNull(video.deletedAt)),
      columns: {
        id: true,
      },
    });

    const videoIds = videos.map((v) => v.id);

    if (videoIds.length === 0) {
      return {
        success: true,
        message: "No approved videos found",
        details: { successful: 0, failed: 0, errors: [] },
      };
    }

    const results = await bulkUpsertVideosToTypesense(videoIds, {
      calculateScores: true,
    });

    return {
      success: true,
      message: `Synced ${results.successful} of ${videoIds.length} approved videos`,
      details: results,
    };
  }),
});
