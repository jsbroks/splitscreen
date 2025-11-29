import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../trpc";

export const creatorsRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        username: z.string().min(1).max(50),
        displayName: z.string().min(1).max(100),
        aliases: z.array(z.string()).default([]),
        image: z.string().url().optional(),
        birthday: z.string().optional(),
        links: z.array(z.string().url()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username already exists
      const existingCreator = await ctx.db.query.creator.findFirst({
        where: eq(schema.creator.username, input.username),
      });

      if (existingCreator) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A creator with this username already exists",
        });
      }

      const creatorId = nanoid();

      // Create creator
      const [creator] = await ctx.db
        .insert(schema.creator)
        .values({
          id: creatorId,
          username: input.username,
          displayName: input.displayName,
          aliases: input.aliases,
          image: input.image ?? null,
          birthday: input.birthday ?? null,
        })
        .returning();

      // Create links if provided
      if (input.links.length > 0) {
        await ctx.db.insert(schema.creatorLinks).values(
          input.links.map((link) => ({
            id: nanoid(),
            creatorId: creatorId,
            link,
          })),
        );
      }

      return creator;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.creator.findMany({
      with: {
        links: true,
      },
      orderBy: (creators, { asc }) => [asc(creators.displayName)],
    });
  }),

  infiniteList: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const creators = await ctx.db.query.creator.findMany({
        with: {
          links: true,
        },
        orderBy: (creators, { asc }) => [asc(creators.displayName)],
        limit: input.limit,
        offset: input.cursor,
      });

      return creators;
    }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const creator = await ctx.db.query.creator.findFirst({
        where: eq(schema.creator.username, input.username),
        with: {
          links: true,
        },
      });

      if (!creator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Creator not found",
        });
      }

      return creator;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const creator = await ctx.db.query.creator.findFirst({
        where: eq(schema.creator.id, input.id),
        with: {
          links: true,
        },
      });

      if (!creator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Creator not found",
        });
      }

      return creator;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        username: z.string().min(1).max(50).optional(),
        displayName: z.string().min(1).max(100).optional(),
        aliases: z.array(z.string()).optional(),
        image: z.string().url().optional().nullable(),
        birthday: z.string().optional().nullable(),
        linksToAdd: z.array(z.string().url()).optional(),
        linksToRemove: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, linksToAdd, linksToRemove, ...updateData } = input;

      // Check if creator exists
      const existingCreator = await ctx.db.query.creator.findFirst({
        where: eq(schema.creator.id, id),
      });

      if (!existingCreator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Creator not found",
        });
      }

      // If username is being changed, check if it's already taken
      if (
        updateData.username &&
        updateData.username !== existingCreator.username
      ) {
        const usernameExists = await ctx.db.query.creator.findFirst({
          where: eq(schema.creator.username, updateData.username),
        });

        if (usernameExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A creator with this username already exists",
          });
        }
      }

      // Update creator
      const updates: Record<string, unknown> = {};
      if (updateData.username !== undefined)
        updates.username = updateData.username;
      if (updateData.displayName !== undefined)
        updates.displayName = updateData.displayName;
      if (updateData.aliases !== undefined)
        updates.aliases = updateData.aliases;
      if (updateData.image !== undefined) updates.image = updateData.image;
      if (updateData.birthday !== undefined)
        updates.birthday = updateData.birthday;

      if (Object.keys(updates).length > 0) {
        await ctx.db
          .update(schema.creator)
          .set(updates)
          .where(eq(schema.creator.id, id));
      }

      // Add new links
      if (linksToAdd && linksToAdd.length > 0) {
        await ctx.db.insert(schema.creatorLinks).values(
          linksToAdd.map((link) => ({
            id: nanoid(),
            creatorId: id,
            link,
          })),
        );
      }

      // Remove links
      if (linksToRemove && linksToRemove.length > 0) {
        for (const linkId of linksToRemove) {
          await ctx.db
            .delete(schema.creatorLinks)
            .where(eq(schema.creatorLinks.id, linkId));
        }
      }

      // Return updated creator
      return ctx.db.query.creator.findFirst({
        where: eq(schema.creator.id, id),
        with: {
          links: true,
        },
      });
    }),

  deleteLink: adminProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.creatorLinks)
        .where(eq(schema.creatorLinks.id, input.linkId));
      return { success: true };
    }),

  // Simplified creator creation for regular users (no admin required)
  quickCreate: publicProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate username from display name
      const username = input.displayName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 50);

      // Check if username already exists
      const existingCreator = await ctx.db.query.creator.findFirst({
        where: eq(schema.creator.username, username),
      });

      if (existingCreator) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A creator with this name already exists",
        });
      }

      const creatorId = nanoid();

      // Create basic creator (users can add more details later via admin)
      const [creator] = await ctx.db
        .insert(schema.creator)
        .values({
          id: creatorId,
          username: username || `creator_${Date.now()}`,
          displayName: input.displayName,
          aliases: [],
          image: null,
          birthday: null,
        })
        .returning();

      return creator;
    }),
});
