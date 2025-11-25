import crypto from "node:crypto";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { env } from "~/env";
import { db } from "~/server/db";
import { video as videoTable } from "~/server/db/schema/videos";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const videosRouter = createTRPCRouter({
  getLatest: publicProcedure.query(async () => {
    return [];
  }),

  generateUploadUrl: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        filename: z.string().min(1),
        contentType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.S3_BUCKET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "S3_BUCKET not configured",
        });
      }

      const videoId = crypto.randomUUID();
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
        userId: ctx.session.user.id,
        title: input.title.trim(),
        description: input.description ?? null,
        originalKey: key,
      });
      return { videoId, key, uploadUrl, bucket: env.S3_BUCKET };
    }),
});
