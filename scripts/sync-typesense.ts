#!/usr/bin/env tsx
/**
 * CLI script for syncing videos to Typesense
 *
 * Usage:
 *   pnpm tsx scripts/sync-typesense.ts --help
 *   pnpm tsx scripts/sync-typesense.ts sync-all
 *   pnpm tsx scripts/sync-typesense.ts sync-video VIDEO_ID
 *   pnpm tsx scripts/sync-typesense.ts sync-recent
 *   pnpm tsx scripts/sync-typesense.ts delete VIDEO_ID
 */

import { parseArgs } from "node:util";
import { db, gte, isNull } from "~/server/db";
import * as schema from "~/server/db/schema";
import {
  bulkUpsertVideosToTypesense,
  deleteVideoFromTypesense,
  syncAllVideosToTypesense,
  upsertVideoToTypesense,
} from "~/server/typesense/utils";

const COMMANDS = {
  "sync-all": "Sync all videos from database to Typesense",
  "sync-video": "Sync a specific video by ID (usage: sync-video VIDEO_ID)",
  "sync-recent": "Sync videos that had activity in the last 24 hours",
  "sync-approved": "Sync only approved videos",
  delete: "Delete a video from Typesense (usage: delete VIDEO_ID)",
  help: "Show this help message",
} as const;

function showHelp() {
  console.log("Typesense Video Sync CLI\n");
  console.log("Commands:");
  for (const [cmd, description] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(20)} ${description}`);
  }
  console.log("\nExamples:");
  console.log("  pnpm tsx scripts/sync-typesense.ts sync-all");
  console.log("  pnpm tsx scripts/sync-typesense.ts sync-video abc123");
  console.log("  pnpm tsx scripts/sync-typesense.ts sync-recent");
  console.log("  pnpm tsx scripts/sync-typesense.ts delete abc123");
}

async function syncAll() {
  console.log("🔄 Syncing all videos to Typesense...\n");
  await syncAllVideosToTypesense({ calculateScores: true });
}

async function syncVideo(videoId: string) {
  if (!videoId) {
    console.error("❌ Error: Video ID is required");
    console.log("Usage: sync-video VIDEO_ID");
    process.exit(1);
  }

  console.log(`🔄 Syncing video ${videoId} to Typesense...\n`);
  const result = await upsertVideoToTypesense(videoId, {
    calculateScores: true,
  });

  if (result) {
    console.log("\n✅ Video synced successfully!");
    console.log("\nDocument:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("❌ Video not found or failed to sync");
    process.exit(1);
  }
}

async function syncRecent() {
  console.log("🔄 Syncing recently active videos...\n");

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get videos with recent views
  const recentVideoIds = await db
    .selectDistinct({ videoId: schema.videoView.videoId })
    .from(schema.videoView)
    .where(gte(schema.videoView.createdAt, twentyFourHoursAgo));

  const videoIds = recentVideoIds.map((v) => v.videoId);

  if (videoIds.length === 0) {
    console.log("No recently active videos found");
    return;
  }

  console.log(`Found ${videoIds.length} videos with recent activity\n`);

  const results = await bulkUpsertVideosToTypesense(videoIds, {
    calculateScores: true,
  });

  console.log("\n✅ Sync complete!");
  console.log(`  Success: ${results.successful}`);
  console.log(`  Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log("\n❌ Errors:");
    for (const error of results.errors) {
      console.log(`  ${error.videoId}: ${error.error}`);
    }
  }
}

async function syncApproved() {
  console.log("🔄 Syncing approved videos...\n");

  const approvedVideos = await db.query.video.findMany({
    where: (video, { and, eq }) =>
      and(eq(video.status, "approved"), isNull(video.deletedAt)),
    columns: {
      id: true,
    },
  });

  const videoIds = approvedVideos.map((v) => v.id);

  if (videoIds.length === 0) {
    console.log("No approved videos found");
    return;
  }

  console.log(`Found ${videoIds.length} approved videos\n`);

  const results = await bulkUpsertVideosToTypesense(videoIds, {
    calculateScores: true,
  });

  console.log("\n✅ Sync complete!");
  console.log(`  Success: ${results.successful}`);
  console.log(`  Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log("\n❌ Errors:");
    for (const error of results.errors) {
      console.log(`  ${error.videoId}: ${error.error}`);
    }
  }
}

async function deleteVideo(videoId: string) {
  if (!videoId) {
    console.error("❌ Error: Video ID is required");
    console.log("Usage: delete VIDEO_ID");
    process.exit(1);
  }

  console.log(`🗑️  Deleting video ${videoId} from Typesense...\n`);
  await deleteVideoFromTypesense(videoId);
  console.log("✅ Video deleted successfully!");
}

async function main() {
  const { positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
  });

  const command = positionals[0];
  const arg = positionals[1];

  if (!command || command === "help") {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case "sync-all":
        await syncAll();
        break;
      case "sync-video":
        await syncVideo(arg ?? "");
        break;
      case "sync-recent":
        await syncRecent();
        break;
      case "sync-approved":
        await syncApproved();
        break;
      case "delete":
        await deleteVideo(arg ?? "");
        break;
      default:
        console.error(`❌ Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
