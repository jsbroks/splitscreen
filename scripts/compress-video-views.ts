/**
 * Script to compress old video views from the videoView table
 * into the denormalized viewCount column in the video table.
 *
 * Usage:
 *   npx tsx scripts/compress-video-views.ts [--days=30] [--dry-run]
 *
 * Options:
 *   --days=N    Compress views older than N days (default: 30)
 *   --dry-run   Show statistics without actually compressing
 */

import {
  compressOldVideoViews,
  getViewCompressionStats,
} from "~/server/db/utils/compress-video-views";

async function main() {
  const args = process.argv.slice(2);
  const daysArg = args.find((arg) => arg.startsWith("--days="));
  const dryRun = args.includes("--dry-run");

  const days = daysArg
    ? Number.parseInt(daysArg.split("=")[1] || "30", 10)
    : 30;
  const olderThan = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log("📊 Video View Compression Tool\n");
  console.log(
    `Target: Views older than ${days} days (${olderThan.toISOString()})`,
  );
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

  // Get statistics
  console.log("Fetching statistics...\n");
  const stats = await getViewCompressionStats(olderThan);

  console.log("Current State:");
  console.log(`  Total views in table: ${stats.totalViews.toLocaleString()}`);
  console.log(`  Old views (can compress): ${stats.oldViews.toLocaleString()}`);
  console.log(`  Recent views (keep): ${stats.recentViews.toLocaleString()}`);
  console.log(
    `  Videos with old views: ${stats.videosWithOldViews.toLocaleString()}`,
  );
  console.log(`  Potential space savings: ${stats.potentialSavings}\n`);

  if (stats.oldViews === 0) {
    console.log("✅ No old views to compress!");
    return;
  }

  if (dryRun) {
    console.log("🔍 Dry run complete. Use without --dry-run to compress.");
    return;
  }

  // Confirm before proceeding
  console.log("⚠️  This will:");
  console.log(
    `   1. Add ${stats.oldViews.toLocaleString()} to video viewCount columns`,
  );
  console.log(
    `   2. Delete ${stats.oldViews.toLocaleString()} rows from videoView table`,
  );
  console.log("   3. This operation cannot be undone!\n");

  // In a non-interactive environment, require explicit confirmation
  if (process.env.CONFIRM_COMPRESS !== "yes") {
    console.log("Set CONFIRM_COMPRESS=yes environment variable to proceed.");
    console.log(
      "Example: CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts",
    );
    return;
  }

  console.log("Starting compression...\n");
  const results = await compressOldVideoViews({ olderThan });

  console.log("\n📈 Results:");
  console.log(`  Videos processed: ${results.videosProcessed}`);
  console.log(`  Views compressed: ${results.viewsCompressed}`);
  console.log(`  Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log("\n❌ Errors encountered:");
    for (const error of results.errors) {
      console.log(`  - ${error.videoId}: ${error.error}`);
    }
  }

  console.log("\n✅ Compression complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
