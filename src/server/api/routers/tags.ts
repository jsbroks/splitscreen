import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const tagsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.tag.findMany({
      orderBy: (tags, { asc }) => [asc(tags.name)],
    });
  }),

  quickCreate: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if tag with this name already exists (case-insensitive)
      const existingTag = await ctx.db.query.tag.findFirst({
        where: eq(schema.tag.name, input.name),
      });

      if (existingTag) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A tag with this name already exists",
        });
      }

      const tagId = nanoid();

      // Create tag
      const [tag] = await ctx.db
        .insert(schema.tag)
        .values({
          id: tagId,
          name: input.name,
          slug: input.name,
        })
        .returning();

      return tag;
    }),
});
