import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { env } from "~/env";
import {
  and,
  asc,
  count,
  db,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  type SQL,
  takeFirst,
  takeFirstOrNull,
} from "~/server/db";
import * as schema from "~/server/db/schema";
import { createVideoId } from "~/server/db/schema/videos";
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
        thumbnailFilename: z.string().optional(),
        thumbnailContentType: z.string().optional(),
        creatorId: z.string().optional(),
        featuredCreatorIds: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
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
      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: 60 * 30, // 30 mins
      });

      // Generate thumbnail upload URL if thumbnail is provided
      let thumbnailUploadUrl: string | undefined;
      let thumbnailKey: string | undefined;
      if (input.thumbnailFilename) {
        const thumbFilename = path.basename(input.thumbnailFilename);
        thumbnailKey = `originals/${videoId}/${thumbFilename}`;
        const thumbCommand = new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: thumbnailKey,
          ContentType: input.thumbnailContentType ?? "image/jpeg",
        });
        thumbnailUploadUrl = await getSignedUrl(client, thumbCommand, {
          expiresIn: 60 * 30, // 30 mins
        });
      }
      await db.insert(schema.video).values({
        id: videoId,
        uploadedById: ctx.session.user.id,
        title: input.title.trim(),
        description: input.description ?? null,
        originalKey: key,
        originalThumbnailKey: thumbnailKey ?? null,
        creatorId: input.creatorId ?? null,
        status: "uploaded",
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

      // Add tags if provided
      if (input.tags && input.tags.length > 0) {
        const existingTags = await db.query.tag.findMany();
        const existingTagMap = new Map(
          existingTags.map((t) => [t.name.toLowerCase(), t.id]),
        );
        const tagIds: string[] = [];

        for (const tagName of input.tags) {
          const normalizedName = tagName.trim();
          const lowerName = normalizedName.toLowerCase();

          // Check if tag exists
          if (existingTagMap.has(lowerName)) {
            tagIds.push(existingTagMap.get(lowerName) ?? "");
          } else {
            // Create new tag
            const newTagId = nanoid();

            await db.insert(schema.tag).values({
              id: newTagId,
              name: normalizedName,
              slug: normalizedName,
            });

            tagIds.push(newTagId);
            existingTagMap.set(lowerName, newTagId);
          }
        }

        // Link tags to video
        if (tagIds.length > 0) {
          await db.insert(schema.videoTag).values(
            tagIds.map((tagId) => ({
              id: nanoid(),
              videoId: videoId,
              tagId: tagId,
            })),
          );
        }
      }

      await db.insert(schema.transcodeQueue).values({
        id: nanoid(),
        videoId: videoId,
        inputKey: key,
        outputPrefix: `videos/${videoId}`,
        status: "queued",
      });

      return {
        videoId,
        key,
        uploadUrl,
        bucket: env.S3_BUCKET,
        thumbnailUploadUrl,
        thumbnailKey,
      };
    }),

  getVideo: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.query.video.findFirst({
        where: and(
          eq(schema.video.id, input.videoId),
          isNull(schema.video.deletedAt),
        ),
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

      if (!video) {
        return null;
      }

      const views = await ctx.db
        .select({ count: count() })
        .from(schema.videoView)
        .where(eq(schema.videoView.videoId, input.videoId))
        .then(takeFirst);

      const transcode = video?.transcodeQueue[0];
      const hlsSource = transcode
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/master.m3u8`
        : null;

      const hoverPreviewMp4 = transcode
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/hover.mp4`
        : null;
      const hoverPreviewWebm = transcode
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/hover.webm`
        : null;

      const thumbnailsVtt = transcode
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/thumbnails.vtt`
        : null;

      const thumbnailUrl = video.originalThumbnailKey
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${video.originalThumbnailKey}`
        : null;

      const videoUrl = video.originalKey
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${video.originalKey}`
        : null;

      return {
        ...video,
        thumbnailUrl,
        videoUrl,
        transcode: {
          ...(transcode ?? {}),
          hlsSource,
          hoverPreviewMp4,
          hoverPreviewWebm,
          thumbnailsVtt,
        },
        views: views?.count ?? 0,
      };
    }),

  videos: publicProcedure
    .input(
      z.object({
        uploadedById: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        status: z
          .enum([
            "uploaded",
            "processing",
            "in_review",
            "approved",
            "rejected",
            "failed",
          ])
          .array()
          .optional(),
        orderBy: z.enum(["newest", "oldest"]).optional().default("newest"),
      }),
    )
    .query(async ({ ctx, input }) => {
      let isAdmin = false;
      if (ctx.session?.user) {
        const user = await ctx.db.query.user.findFirst({
          where: (users, { eq }) => eq(users.id, ctx.session?.user.id ?? ""),
        });

        isAdmin = user?.isAdmin ?? false;
      }

      let where: SQL<unknown> | undefined;

      // Filter out deleted videos
      where = and(where, isNull(schema.video.deletedAt));

      if (input.uploadedById) {
        where = and(where, eq(schema.video.uploadedById, input.uploadedById));
      }

      if (input.status) {
        where = and(where, inArray(schema.video.status, input.status));
      } else if (!isAdmin) {
        where = and(where, eq(schema.video.status, "approved"));
      }

      const videos = await ctx.db.query.video.findMany({
        orderBy: [
          input.orderBy === "oldest"
            ? asc(schema.video.createdAt)
            : desc(schema.video.createdAt),
        ],
        where,
        with: {
          transcodeQueue: {
            orderBy: [asc(schema.transcodeQueue.createdAt)],
          },
        },
        limit: input.limit ?? 24,
        offset: input.offset ?? 0,
      });

      const views = await ctx.db
        .select({ videoId: schema.videoView.videoId, count: count() })
        .from(schema.videoView)
        .groupBy(schema.videoView.videoId);

      return videos.map((v) => {
        const viewsCount = views.find((v2) => v2.videoId === v.id)?.count ?? 0;
        const transcode = v.transcodeQueue[0];
        const hlsSource = transcode
          ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/master.m3u8`
          : null;

        const hoverPreviewMp4 = transcode
          ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/hover.mp4`
          : null;
        const hoverPreviewWebm = transcode
          ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/hover.webm`
          : null;

        const thumbnailsVtt = transcode
          ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/thumbnails.vtt`
          : null;

        const thumbnail25pct = transcode
          ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${transcode.outputPrefix}/thumb_25pct.jpg`
          : null;

        const thumbnailUrl = v.originalThumbnailKey
          ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${v.originalThumbnailKey}`
          : null;

        return {
          ...v,
          views: viewsCount,
          thumbnailUrl,
          transcode: {
            ...v.transcodeQueue[0],
            thumbnailsVtt,
            hoverPreviewWebm,
            hoverPreviewMp4,
            hlsSource,
            thumbnail25pct,
          },
        };
      });
    }),

  updateVideo: protectedProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        creatorId: z.string().optional(),
        featuredCreatorIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the video to check ownership
      const video = await ctx.db.query.video.findFirst({
        where: eq(schema.video.id, input.videoId),
      });

      if (!video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      // Check if user is the uploader or an admin
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session.user.id),
      });

      const isUploader = video.uploadedById === ctx.session.user.id;
      const isAdmin = user?.isAdmin ?? false;

      if (!isUploader && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this video",
        });
      }

      // Update video metadata
      const updateData: Partial<typeof schema.video.$inferInsert> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.creatorId !== undefined)
        updateData.creatorId = input.creatorId || null;

      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(schema.video)
          .set(updateData)
          .where(eq(schema.video.id, input.videoId));
      }

      // Update featured creators if provided
      if (input.featuredCreatorIds !== undefined) {
        // Delete existing featured creators
        await ctx.db
          .delete(schema.videoFeaturedCreator)
          .where(eq(schema.videoFeaturedCreator.videoId, input.videoId));

        // Add new featured creators
        if (input.featuredCreatorIds.length > 0) {
          await ctx.db.insert(schema.videoFeaturedCreator).values(
            input.featuredCreatorIds.map((creatorId) => ({
              id: nanoid(),
              videoId: input.videoId,
              creatorId: creatorId,
            })),
          );
        }
      }

      return { success: true };
    }),

  deleteVideo: protectedProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the video to check ownership
      const video = await ctx.db.query.video.findFirst({
        where: eq(schema.video.id, input.videoId),
      });

      if (!video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      // Check if user is the uploader or an admin
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session.user.id),
      });

      const isUploader = video.uploadedById === ctx.session.user.id;
      const isAdmin = user?.isAdmin ?? false;

      if (!isUploader && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this video",
        });
      }

      // Soft delete by setting deletedAt timestamp
      await ctx.db
        .update(schema.video)
        .set({ deletedAt: new Date() })
        .where(eq(schema.video.id, input.videoId));

      return { success: true };
    }),

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
