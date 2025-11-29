import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";
import { createVideoId } from "~/server/db/schema/videos";
import { upsertVideoToTypesense } from "~/server/typesense/utils/upsert-video";

const videoUploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().optional(),
  thumbnailFilename: z.string().optional(),
  thumbnailContentType: z.string().optional(),
  creatorId: z.string().optional(),
  featuredCreatorIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    // Check authentication - either session or API key
    const authHeader = request.headers.get("authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    let userId: string;

    if (apiKey && apiKey === env.INTERNAL_API_KEY) {
      // For API key auth, we'll need a userId in the request body
      const rawBody = await request.json();
      if (!rawBody.userId) {
        return NextResponse.json(
          { error: "userId is required when using API key authentication" },
          { status: 400 },
        );
      }
      userId = rawBody.userId;

      // Re-parse with the userId included
      const body = videoUploadSchema.parse(rawBody);
      return await handleVideoUpload(body, userId);
    } else {
      // Check session authentication
      const session = await getSession();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Unauthorized - please provide a valid session or API key" },
          { status: 401 },
        );
      }
      userId = session.user.id;

      const body = videoUploadSchema.parse(await request.json());
      return await handleVideoUpload(body, userId);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating video upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleVideoUpload(
  input: z.infer<typeof videoUploadSchema>,
  userId: string,
) {
  if (!env.S3_BUCKET) {
    return NextResponse.json(
      { error: "S3_BUCKET not configured" },
      { status: 500 },
    );
  }

  const videoId = createVideoId();

  // Generate S3 upload URL for video
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

  // Insert video record in database
  await db.insert(schema.video).values({
    id: videoId,
    uploadedById: userId,
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

  // Add to transcode queue
  await db.insert(schema.transcodeQueue).values({
    id: nanoid(),
    videoId: videoId,
    inputKey: key,
    outputPrefix: `videos/${videoId}`,
    status: "queued",
  });

  // Update Typesense (async, don't wait)
  upsertVideoToTypesense(videoId).catch(console.error);

  return NextResponse.json({
    videoId,
    key,
    uploadUrl,
    bucket: env.S3_BUCKET,
    thumbnailUploadUrl,
    thumbnailKey,
  });
}
