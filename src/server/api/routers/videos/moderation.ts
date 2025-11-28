import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { asc, db, eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";

/**
 * Router for video moderation (approval, rejection, reports)
 */
export const videoModerationRouter = createTRPCRouter({
  approveVideo: protectedProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is an admin
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session.user.id),
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can approve videos",
        });
      }

      // Get the video
      const video = await ctx.db.query.video.findFirst({
        where: eq(schema.video.id, input.videoId),
      });

      if (!video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      // Update video status to approved
      await ctx.db
        .update(schema.video)
        .set({ status: "approved" })
        .where(eq(schema.video.id, input.videoId));

      return { success: true };
    }),

  rejectVideo: protectedProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is an admin
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session.user.id),
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can reject videos",
        });
      }

      // Get the video
      const video = await ctx.db.query.video.findFirst({
        where: eq(schema.video.id, input.videoId),
      });

      if (!video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      // Update video status to rejected with optional message
      await ctx.db
        .update(schema.video)
        .set({
          status: "rejected",
          rejectionMessage: input.message ?? null,
        })
        .where(eq(schema.video.id, input.videoId));

      return { success: true };
    }),

  reportVideo: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        reasons: z
          .enum([
            "underage_content",
            "abuse",
            "illegal_content",
            "wrong_tags",
            "spam_unrelated",
            "dmca",
            "other",
          ])
          .array()
          .min(1, "Please select at least one reason"),
        details: z.string().min(1, "Description is required"),
        fullName: z.string().min(1, "Full name is required"),
        email: z.string().email("Invalid email address"),
        fingerprint: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;

      if (!userId && !input.fingerprint) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fingerprint is required for anonymous reports",
        });
      }

      // Check if video exists
      const video = await ctx.db.query.video.findFirst({
        where: eq(schema.video.id, input.videoId),
      });

      if (!video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      // Create the report
      await db.insert(schema.videoReport).values({
        id: nanoid(),
        videoId: input.videoId,
        reportedById: userId ?? null,
        fingerprintId: userId ? null : (input.fingerprint ?? null),
        reasons: input.reasons,
        details: input.details,
        fullName: input.fullName,
        email: input.email,
      });

      return { success: true };
    }),

  getReports: protectedProcedure
    .input(
      z.object({
        archived: z.boolean().optional(),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if user is an admin
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session.user.id),
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view reports",
        });
      }

      const reports = await ctx.db.query.videoReport.findMany({
        where:
          input.archived !== undefined
            ? eq(schema.videoReport.archived, input.archived)
            : undefined,
        with: {
          video: true,
          reportedBy: true,
        },
        orderBy: [asc(schema.videoReport.createdAt)],
        limit: input.limit ?? 100,
      });

      return reports;
    }),

  archiveReport: protectedProcedure
    .input(
      z.object({
        reportId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is an admin
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session.user.id),
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can archive reports",
        });
      }

      await ctx.db
        .update(schema.videoReport)
        .set({ archived: true })
        .where(eq(schema.videoReport.id, input.reportId));

      return { success: true };
    }),
});
