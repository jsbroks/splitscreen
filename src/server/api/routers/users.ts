import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { and, count, db, eq, takeFirst } from "~/server/db";
import * as schema from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const usersRouter = createTRPCRouter({
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
});
