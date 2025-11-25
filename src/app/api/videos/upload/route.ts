import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { transcodeQueue } from "~/server/db/schema/queue";
import { createVideoId, video } from "~/server/db/schema/videos";

const UPLOAD_ROOT = "/tmp/splitscreen/uploads";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If JSON, generate a presigned URL for direct S3 upload
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = (await req.json()) as {
        title?: string;
        description?: string;
        filename?: string;
        contentType?: string;
      };
      const title = (body.title ?? "").trim();
      if (!title) {
        return NextResponse.json({ error: "Missing title" }, { status: 400 });
      }
      const filename = path.basename(body.filename ?? "upload.mp4");
      const contentType = body.contentType ?? "application/octet-stream";

      const videoId = createVideoId();

      const originalsPrefix = "originals";
      const key = `${originalsPrefix}/${videoId}/${filename}`;
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
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
      // Insert video record with S3 key; size is unknown until upload completes
      await db.insert(video).values({
        id: videoId,
        userId: session.user.id,
        title,
        description: body.description ? String(body.description) : null,
        originalKey: key,
      });

      // Defer enqueue until a "finalize" step or background scanner confirms upload
      return NextResponse.json(
        { videoId, key, uploadUrl, bucket: env.S3_BUCKET },
        { status: 200 },
      );
    }

    // Otherwise, handle legacy form-data upload to server disk
    const form = await req.formData();
    const file = form.get("file");
    const title = form.get("title");
    const description = form.get("description");
    const thumbnail = form.get("thumbnail");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const videoId = createVideoId();
    const queueId = nanoid();

    const originalName = file.name ?? "upload";
    const ext = path.extname(originalName) ?? ".mp4";
    const destDir = path.join(UPLOAD_ROOT);
    const destPath = path.join(destDir, `${videoId}${ext}`);

    await mkdir(destDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(destPath, buf);

    // Optional thumbnail
    let thumbBuf: Buffer | undefined;
    let thumbExt = ".jpg";
    if (thumbnail instanceof File) {
      const thumbName = thumbnail.name ?? "thumbnail";
      thumbExt = path.extname(thumbName) ?? ".jpg";
      thumbBuf = Buffer.from(await thumbnail.arrayBuffer());
      const thumbPath = path.join(destDir, `${videoId}-thumb${thumbExt}`);
      await writeFile(thumbPath, thumbBuf);
    }

    // If configured, upload originals (video and optional thumbnail) to S3 under originals/<videoId>/
    let originalKeyForDb: string | undefined;
    if (env.S3_BUCKET) {
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
      const originalsPrefix = "originals";
      const s3VideoKey = `${originalsPrefix}/${videoId}/${originalName}`;
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: s3VideoKey,
          Body: buf,
          ContentType: (file as File).type || "application/octet-stream",
        }),
      );
      if (thumbBuf) {
        const s3ThumbKey = `${originalsPrefix}/${videoId}/thumbnail${thumbExt}`;
        await client.send(
          new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: s3ThumbKey,
            Body: thumbBuf,
            ContentType: (thumbnail as File).type || "image/jpeg",
          }),
        );
      }
      originalKeyForDb = s3VideoKey;
    }

    // Insert DB records
    await db.insert(video).values({
      id: videoId,
      userId: session.user.id,
      title: title.trim(),
      description: typeof description === "string" ? description : null,
      originalKey: originalKeyForDb ?? destPath,
      sizeBytes: buf.byteLength,
    });

    // Enqueue transcode job
    await db.insert(transcodeQueue).values({
      id: queueId,
      videoId,
      inputKey: destPath, // local path consumed by transcoder
      outputPrefix: `videos/${videoId}`, // S3 prefix for outputs
    });

    return NextResponse.json({ videoId }, { status: 200 });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
