import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { db, eq } from "~/server/db";
import * as schema from "~/server/db/schema";

// Validation schema for creator upsert
const creatorUpsertSchema = z.object({
  username: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  aliases: z.array(z.string()).default([]),
  image: z.string().url().optional().nullable(),
  birthday: z.string().optional().nullable(), // YYYY-MM-DD format
  links: z.array(z.string().url()).default([]),
});

type CreatorUpsertInput = z.infer<typeof creatorUpsertSchema>;

/**
 * POST /api/v1/creators
 * Upsert a creator (create or update based on username)
 * Requires API key authentication via x-api-key header
 */
export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const apiKey = request.headers.get("x-api-key");

    if (!env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "API key authentication is not configured on the server" },
        { status: 500 },
      );
    }

    if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = creatorUpsertSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const data: CreatorUpsertInput = validationResult.data;

    // Check if creator exists by username
    const existingCreator = await db.query.creator.findFirst({
      where: eq(schema.creator.username, data.username),
      with: {
        links: true,
      },
    });

    let creatorId: string;
    let isNew = false;

    if (existingCreator) {
      // Update existing creator
      creatorId = existingCreator.id;

      await db
        .update(schema.creator)
        .set({
          displayName: data.displayName,
          aliases: data.aliases,
          image: data.image ?? null,
          birthday: data.birthday ?? null,
        })
        .where(eq(schema.creator.id, creatorId));

      // Delete existing links
      if (existingCreator.links.length > 0) {
        await db
          .delete(schema.creatorLinks)
          .where(eq(schema.creatorLinks.creatorId, creatorId));
      }
    } else {
      // Create new creator
      isNew = true;
      creatorId = nanoid();

      await db.insert(schema.creator).values({
        id: creatorId,
        username: data.username,
        displayName: data.displayName,
        aliases: data.aliases,
        image: data.image ?? null,
        birthday: data.birthday ?? null,
      });
    }

    // Insert new links if provided
    if (data.links.length > 0) {
      await db.insert(schema.creatorLinks).values(
        data.links.map((link) => ({
          id: nanoid(),
          creatorId: creatorId,
          link,
        })),
      );
    }

    // Fetch the updated/created creator with links
    const creator = await db.query.creator.findFirst({
      where: eq(schema.creator.id, creatorId),
      with: {
        links: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        action: isNew ? "created" : "updated",
        creator,
      },
      { status: isNew ? 201 : 200 },
    );
  } catch (error) {
    console.error("Error upserting creator:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
