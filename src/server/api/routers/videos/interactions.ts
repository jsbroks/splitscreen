import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { and, count, eq, gt, takeFirst, takeFirstOrNull } from "~/server/db";
import * as schema from "~/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../../trpc";

/**
 * Router for user interactions with videos (views, reactions)
 */
export const videoInteractionsRouter = createTRPCRouter({
  view: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        fingerprint: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // Check if there's a recent view (within last 10 minutes)
      const recentView = await ctx.db
        .select()
        .from(schema.videoView)
        .where(
          and(
            eq(schema.videoView.videoId, input.videoId),
            gt(schema.videoView.createdAt, tenMinutesAgo),
            userId
              ? eq(schema.videoView.userId, userId)
              : eq(schema.videoView.fingerprintId, input.fingerprint ?? ""),
          ),
        )
        .then(takeFirstOrNull);

      // If there's a recent view, don't create a new one
      if (recentView) {
        return { viewId: recentView.id, isNew: false };
      }

      // Create a new view
      const result = await ctx.db
        .insert(schema.videoView)
        .values({
          id: nanoid(),
          videoId: input.videoId,
          userId: userId ?? null,
          fingerprintId: userId ? null : (input.fingerprint ?? null),
        })
        .returning();

      return { viewId: result[0]?.id, isNew: true };
    }),

  getReaction: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        fingerprint: z.string().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      if (!userId && !input.fingerprint) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fingerprint is required",
        });
      }

      const totalLikes =
        (
          await ctx.db
            .select({ count: count() })
            .from(schema.videoReaction)
            .where(
              and(
                eq(schema.videoReaction.videoId, input.videoId),
                eq(schema.videoReaction.reactionType, "like"),
              ),
            )
            .then(takeFirst)
        ).count ?? 0;

      return {
        totalLikes,
        reaction: await ctx.db
          .select()
          .from(schema.videoReaction)
          .where(
            and(
              eq(schema.videoReaction.videoId, input.videoId),
              userId
                ? eq(schema.videoReaction.userId, userId)
                : eq(
                    schema.videoReaction.fingerprintId,
                    input.fingerprint ?? "",
                  ),
            ),
          )
          .then(takeFirstOrNull),
      };
    }),

  react: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        fingerprint: z.string().min(1).optional(),
        reaction: z.enum(["like", "dislike", "none"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      if (!userId && !input.fingerprint) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fingerprint is required",
        });
      }

      if (input.reaction === "none") {
        return ctx.db
          .delete(schema.videoReaction)
          .where(
            and(
              eq(schema.videoReaction.videoId, input.videoId),
              userId
                ? eq(schema.videoReaction.userId, userId)
                : eq(
                    schema.videoReaction.fingerprintId,
                    input.fingerprint ?? "",
                  ),
            ),
          );
      }

      return ctx.db
        .insert(schema.videoReaction)
        .values({
          id: nanoid(),
          userId: userId,
          fingerprintId: userId ? null : input.fingerprint,
          videoId: input.videoId,
          reactionType: input.reaction,
        })
        .onConflictDoUpdate({
          target: userId
            ? [schema.videoReaction.userId, schema.videoReaction.videoId]
            : [
                schema.videoReaction.fingerprintId,
                schema.videoReaction.videoId,
              ],
          set: {
            reactionType: input.reaction,
            updatedAt: new Date(),
          },
        });
    }),
});
