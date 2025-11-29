import { z } from "zod";
import {
  compressOldVideoViews,
  getViewCompressionStats,
} from "~/server/db/utils/compress-video-views";
import { adminProcedure, createTRPCRouter } from "../trpc";

/**
 * Router for admin database maintenance operations
 */
export const adminRouter = createTRPCRouter({
  /**
   * Get statistics about the videoView table compression potential
   */
  getViewCompressionStats: adminProcedure
    .input(
      z.object({
        daysOld: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ input }) => {
      const olderThan = new Date(
        Date.now() - input.daysOld * 24 * 60 * 60 * 1000,
      );
      const stats = await getViewCompressionStats(olderThan);

      return {
        daysOld: input.daysOld,
        cutoffDate: olderThan,
        ...stats,
      };
    }),

  /**
   * Compress old video views from the videoView table
   * into the denormalized viewCount column
   */
  compressVideoViews: adminProcedure
    .input(
      z.object({
        daysOld: z.number().min(1).max(365).default(30),
        videoIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const olderThan = new Date(
        Date.now() - input.daysOld * 24 * 60 * 60 * 1000,
      );

      const results = await compressOldVideoViews({
        olderThan,
        videoIds: input.videoIds,
      });

      return {
        success: true,
        message: `Compressed views for ${results.videosProcessed} videos`,
        ...results,
      };
    }),
});
