import { z } from "zod";
import { desc, eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import { adminProcedure, createTRPCRouter } from "../trpc";

/**
 * Router for transcode queue operations (admin only)
 */
export const transcodeQueueRouter = createTRPCRouter({
  /**
   * List all transcode jobs with optional status filter
   */
  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["queued", "running", "done", "failed"]).optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.query.transcodeQueue.findMany({
        where: input?.status
          ? eq(schema.transcodeQueue.status, input.status)
          : undefined,
        with: {
          video: true,
        },
        orderBy: [desc(schema.transcodeQueue.createdAt)],
        limit: input?.limit ?? 50,
      });

      return jobs;
    }),

  /**
   * Get a single transcode job by ID
   */
  getById: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.transcodeQueue.findFirst({
        where: eq(schema.transcodeQueue.id, input.id),
        with: {
          video: true,
        },
      });

      return job;
    }),

  /**
   * Update the status of a transcode job
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["queued", "running", "done", "failed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const updates: {
        status: typeof input.status;
        updatedAt: Date;
        startedAt?: Date;
        finishedAt?: Date;
      } = {
        status: input.status,
        updatedAt: now,
      };

      // Set startedAt when status changes to running
      if (input.status === "running") {
        updates.startedAt = now;
      }

      // Set finishedAt when status changes to done or failed
      if (input.status === "done" || input.status === "failed") {
        updates.finishedAt = now;
      }

      await ctx.db
        .update(schema.transcodeQueue)
        .set(updates)
        .where(eq(schema.transcodeQueue.id, input.id));

      return { success: true };
    }),

  /**
   * Update processing status fields (hls, poster, scrubber, hover preview)
   */
  updateProcessingStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        field: z.enum([
          "hlsStatus",
          "posterStatus",
          "scrubberPreviewStatus",
          "hoverPreviewStatus",
        ]),
        status: z.enum(["pending", "processing", "done", "failed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, string | Date> = {
        [input.field]: input.status,
        updatedAt: new Date(),
      };

      await ctx.db
        .update(schema.transcodeQueue)
        .set(updates)
        .where(eq(schema.transcodeQueue.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a transcode job
   */
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.transcodeQueue)
        .where(eq(schema.transcodeQueue.id, input.id));

      return { success: true };
    }),

  /**
   * Retry a failed job by resetting it to queued
   */
  retry: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.transcodeQueue)
        .set({
          status: "queued",
          error: null,
          startedAt: null,
          finishedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.transcodeQueue.id, input.id));

      return { success: true };
    }),

  /**
   * Get statistics about the transcode queue
   */
  stats: adminProcedure.query(async ({ ctx }) => {
    const [queued, running, done, failed] = await Promise.all([
      ctx.db
        .select({ count: schema.transcodeQueue.id })
        .from(schema.transcodeQueue)
        .where(eq(schema.transcodeQueue.status, "queued")),
      ctx.db
        .select({ count: schema.transcodeQueue.id })
        .from(schema.transcodeQueue)
        .where(eq(schema.transcodeQueue.status, "running")),
      ctx.db
        .select({ count: schema.transcodeQueue.id })
        .from(schema.transcodeQueue)
        .where(eq(schema.transcodeQueue.status, "done")),
      ctx.db
        .select({ count: schema.transcodeQueue.id })
        .from(schema.transcodeQueue)
        .where(eq(schema.transcodeQueue.status, "failed")),
    ]);

    return {
      queued: queued.length,
      running: running.length,
      done: done.length,
      failed: failed.length,
      total: queued.length + running.length + done.length + failed.length,
    };
  }),
});
