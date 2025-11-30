import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { env } from "~/env";
import { and, count, db, eq, takeFirst } from "~/server/db";
import * as schema from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const usersRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.user.findFirst({
      where: eq(schema.user.id, ctx.session.user.id),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  followUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      if (currentUserId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot follow yourself",
        });
      }

      // Check if user exists
      const userToFollow = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, input.userId),
      });

      if (!userToFollow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if already following
      const existingFollow = await ctx.db.query.userFollow.findFirst({
        where: and(
          eq(schema.userFollow.followerId, currentUserId),
          eq(schema.userFollow.followingId, input.userId),
        ),
      });

      if (existingFollow) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already following this user",
        });
      }

      // Create follow
      await db.insert(schema.userFollow).values({
        id: nanoid(),
        followerId: currentUserId,
        followingId: input.userId,
      });

      return { success: true };
    }),

  unfollowUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      // Delete follow
      await db
        .delete(schema.userFollow)
        .where(
          and(
            eq(schema.userFollow.followerId, currentUserId),
            eq(schema.userFollow.followingId, input.userId),
          ),
        );

      return { success: true };
    }),

  isFollowing: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUserId = ctx.session?.user.id;

      if (!currentUserId) {
        return { isFollowing: false };
      }

      const follow = await ctx.db.query.userFollow.findFirst({
        where: and(
          eq(schema.userFollow.followerId, currentUserId),
          eq(schema.userFollow.followingId, input.userId),
        ),
      });

      return { isFollowing: !!follow };
    }),

  getFollowStats: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const followersCount =
        (
          await ctx.db
            .select({ count: count() })
            .from(schema.userFollow)
            .where(eq(schema.userFollow.followingId, input.userId))
            .then(takeFirst)
        ).count ?? 0;

      const followingCount =
        (
          await ctx.db
            .select({ count: count() })
            .from(schema.userFollow)
            .where(eq(schema.userFollow.followerId, input.userId))
            .then(takeFirst)
        ).count ?? 0;

      return {
        followers: followersCount,
        following: followingCount,
      };
    }),

  getFollowers: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const follows = await ctx.db.query.userFollow.findMany({
        where: eq(schema.userFollow.followingId, input.userId),
        with: {
          follower: true,
        },
        limit: input.limit ?? 50,
      });

      return follows.map((f) => f.follower);
    }),

  getFollowing: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const follows = await ctx.db.query.userFollow.findMany({
        where: eq(schema.userFollow.followerId, input.userId),
        with: {
          following: true,
        },
        limit: input.limit ?? 50,
      });

      return follows.map((f) => f.following);
    }),

  generateAvatarUploadUrl: protectedProcedure
    .input(
      z.object({
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

      const userId = ctx.session.user.id;
      const timestamp = Date.now();
      const filename = path.basename(input.filename);
      const key = `avatars/${userId}/${timestamp}-${filename}`;

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
        ContentType: input.contentType ?? "image/jpeg",
      });

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: 60 * 30, // 30 minutes
      });

      // Generate public URL
      const publicUrl = env.S3_PUBLIC_URL_BASE
        ? `${env.S3_PUBLIC_URL_BASE}/${key}`
        : `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;

      return {
        uploadUrl,
        publicUrl,
        key,
      };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        displayUsername: z.string().min(1).max(50).optional(),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Build update object
      const updates: Partial<typeof schema.user.$inferInsert> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.displayUsername !== undefined)
        updates.displayUsername = input.displayUsername;
      if (input.avatarUrl !== undefined) updates.image = input.avatarUrl;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No updates provided",
        });
      }

      // Update user
      await ctx.db
        .update(schema.user)
        .set(updates)
        .where(eq(schema.user.id, userId));

      return { success: true };
    }),
});
