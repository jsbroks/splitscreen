import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { env } from "~/env";
import { db, eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import { createVideoId } from "~/server/db/schema/videos";
import {
  deleteVideoFromTypesense,
  upsertVideoToTypesense,
} from "~/server/typesense/utils/upsert-video";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

/**
 * Router for video mutations (create, update, delete)
 */
export const videoMutationsRouter = createTRPCRouter({
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

      upsertVideoToTypesense(videoId).catch(console.error);

      return {
        videoId,
        key,
        uploadUrl,
        bucket: env.S3_BUCKET,
        thumbnailUploadUrl,
        thumbnailKey,
      };
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

      upsertVideoToTypesense(input.videoId).catch(console.error);
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

      deleteVideoFromTypesense(input.videoId).catch(console.error);

      return { success: true };
    }),
});
