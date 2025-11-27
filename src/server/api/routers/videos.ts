import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { env } from "~/env";
import {
  and,
  count,
  db,
  eq,
  gt,
  takeFirst,
  takeFirstOrNull,
} from "~/server/db";
import * as schema from "~/server/db/schema";
import { createVideoId, video as videoTable } from "~/server/db/schema/videos";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const videosRouter = createTRPCRouter({
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

  generateUploadUrl: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        filename: z.string().min(1),
        contentType: z.string().optional(),
        creatorId: z.string().optional(),
        featuredCreatorIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.S3_BUCKET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "S3_BUCKET not configured",
        });
      }

      const videoId = createVideoId();

      const filename = path.basename(input.filename);
      const key = `originals/${videoId}/${filename}`;
      const client = new S3Client({
        region: env.S3_REGION ?? "us-east-1",
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
        credentials:
          env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
              }
            : undefined,
      });

      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        ContentType: input.contentType ?? "application/octet-stream",
      });
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
      await db.insert(videoTable).values({
        id: videoId,
        uploadedById: ctx.session.user.id,
        title: input.title.trim(),
        description: input.description ?? null,
        originalKey: key,
        creatorId: input.creatorId ?? null,
      });

      // Add featured creators if provided
      if (input.featuredCreatorIds && input.featuredCreatorIds.length > 0) {
        await db.insert(schema.videoFeaturedCreator).values(
          input.featuredCreatorIds.map((creatorId) => ({
            id: nanoid(),
            videoId: videoId,
            creatorId: creatorId,
          })),
        );
      }

      return { videoId, key, uploadUrl, bucket: env.S3_BUCKET };
    }),
});
