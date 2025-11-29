# Upserting Videos to Typesense

Guide for syncing video data from your database to Typesense.

## Quick Start

### Basic Usage

```typescript
import { upsertVideoToTypesense } from "@/server/typesense/utils/upsert-video";

// Upsert a single video
await upsertVideoToTypesense("video_id_123");
```

## Available Functions

### 1. `upsertVideoToTypesense(videoId, options?)`

Upserts a single video to Typesense. Automatically:
- Fetches video from database with all relations (tags, creators, categories)
- Calculates engagement metrics (views, likes, dislikes)
- Calculates time-windowed metrics (24h, 7d)
- Calculates scores (popularity, trending, engagement rate)
- Transforms to Typesense format
- Upserts to Typesense collection

**Parameters:**
- `videoId: string` - The video ID to upsert
- `options?: { calculateScores?: boolean }` - Optional settings

**Returns:** `Promise<VideoV1 | null>` - The upserted document or null if video not found

**Example:**

```typescript
import { upsertVideoToTypesense } from "@/server/typesense/utils";

// Basic upsert with score calculation
const doc = await upsertVideoToTypesense("abc123");

// Upsert without score calculation (faster for bulk operations)
const doc = await upsertVideoToTypesense("abc123", {
  calculateScores: false,
});
```

### 2. `deleteVideoFromTypesense(videoId)`

Deletes a video from Typesense.

**Parameters:**
- `videoId: string` - The video ID to delete

**Returns:** `Promise<void>`

**Example:**

```typescript
import { deleteVideoFromTypesense } from "@/server/typesense/utils";

await deleteVideoFromTypesense("abc123");
```

### 3. `bulkUpsertVideosToTypesense(videoIds, options?)`

Efficiently upserts multiple videos in batches.

**Parameters:**
- `videoIds: string[]` - Array of video IDs to upsert
- `options?: { calculateScores?: boolean }` - Optional settings

**Returns:** 
```typescript
Promise<{
  successful: number;
  failed: number;
  errors: Array<{ videoId: string; error: unknown }>;
}>
```

**Example:**

```typescript
import { bulkUpsertVideosToTypesense } from "@/server/typesense/utils";

const results = await bulkUpsertVideosToTypesense([
  "video1",
  "video2",
  "video3",
]);

console.log(`Success: ${results.successful}, Failed: ${results.failed}`);
```

### 4. `syncAllVideosToTypesense(options?)`

Syncs all non-deleted videos from the database to Typesense.

**Parameters:**
- `options?: { calculateScores?: boolean }` - Optional settings

**Returns:** `Promise<void>`

**Example:**

```typescript
import { syncAllVideosToTypesense } from "@/server/typesense/utils";

// Initial sync or full resync
await syncAllVideosToTypesense();
```

## Integration Patterns

### Pattern 1: Real-time Updates (After Mutations)

Update Typesense immediately after database changes:

```typescript
// In your video mutation router
import { upsertVideoToTypesense, deleteVideoFromTypesense } from "@/server/typesense/utils";

// After creating a video
export const createVideo = protectedProcedure
  .input(videoSchema)
  .mutation(async ({ ctx, input }) => {
    // Create video in database
    const video = await ctx.db.insert(schema.video).values({
      ...input,
    }).returning();
    
    // Sync to Typesense (non-blocking)
    upsertVideoToTypesense(video.id).catch(err => {
      console.error("Failed to sync to Typesense:", err);
    });
    
    return video;
  });

// After updating a video
export const updateVideo = protectedProcedure
  .input(updateVideoSchema)
  .mutation(async ({ ctx, input }) => {
    // Update video in database
    await ctx.db
      .update(schema.video)
      .set({ ...input.data })
      .where(eq(schema.video.id, input.videoId));
    
    // Sync to Typesense
    await upsertVideoToTypesense(input.videoId);
    
    return { success: true };
  });

// After deleting a video (soft delete)
export const deleteVideo = protectedProcedure
  .input(z.object({ videoId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Soft delete in database
    await ctx.db
      .update(schema.video)
      .set({ deletedAt: new Date() })
      .where(eq(schema.video.id, input.videoId));
    
    // Remove from Typesense
    await deleteVideoFromTypesense(input.videoId);
    
    return { success: true };
  });
```

### Pattern 2: Periodic Batch Updates (Cron Jobs)

Update metrics and scores periodically for all videos:

```typescript
// scripts/sync-typesense.ts or in your server startup
import cron from "node-cron";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { bulkUpsertVideosToTypesense } from "@/server/typesense/utils";

// Run every 15 minutes to update scores for recently active videos
cron.schedule("*/15 * * * *", async () => {
  console.log("🔄 Updating Typesense scores for active videos...");
  
  // Get videos that have had activity in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const activeVideoIds = await db
    .selectDistinct({ videoId: schema.videoView.videoId })
    .from(schema.videoView)
    .where(gte(schema.videoView.createdAt, twentyFourHoursAgo));
  
  const videoIds = activeVideoIds.map(v => v.videoId);
  
  if (videoIds.length === 0) {
    console.log("No active videos to update");
    return;
  }
  
  await bulkUpsertVideosToTypesense(videoIds, {
    calculateScores: true,
  });
  
  console.log("✅ Typesense scores updated");
});

// Run daily at 3 AM to do a full sync
cron.schedule("0 3 * * *", async () => {
  console.log("🔄 Running daily Typesense full sync...");
  await syncAllVideosToTypesense();
  console.log("✅ Daily sync complete");
});
```

### Pattern 3: Event-Driven Updates

Update Typesense when specific events occur:

```typescript
// After a video gets a new view
export const recordView = publicProcedure
  .input(viewSchema)
  .mutation(async ({ ctx, input }) => {
    // Record view in database
    await ctx.db.insert(schema.videoView).values({
      videoId: input.videoId,
      userId: ctx.session?.user.id,
      fingerprintId: input.fingerprint,
    });
    
    // Update Typesense (throttled - only every 100 views)
    const viewCount = await getViewCount(input.videoId);
    if (viewCount % 100 === 0) {
      upsertVideoToTypesense(input.videoId).catch(console.error);
    }
    
    return { success: true };
  });

// After a video gets a reaction
export const reactToVideo = publicProcedure
  .input(reactionSchema)
  .mutation(async ({ ctx, input }) => {
    // Save reaction in database
    await ctx.db.insert(schema.videoReaction).values({
      videoId: input.videoId,
      userId: ctx.session?.user.id,
      reactionType: input.type,
    });
    
    // Update Typesense immediately (reactions are important for trending)
    await upsertVideoToTypesense(input.videoId);
    
    return { success: true };
  });

// After tags are updated
export const updateVideoTags = protectedProcedure
  .input(updateTagsSchema)
  .mutation(async ({ ctx, input }) => {
    // Update tags in database
    // ... your tag update logic ...
    
    // Sync to Typesense (tags affect search and filtering)
    await upsertVideoToTypesense(input.videoId);
    
    return { success: true };
  });
```

### Pattern 4: Background Queue (Advanced)

For high-traffic applications, use a queue system:

```typescript
// Using BullMQ or similar
import { Queue } from "bullmq";

const typesenseQueue = new Queue("typesense-sync", {
  connection: redisConnection,
});

// Add to queue instead of direct update
export async function queueTypesenseUpdate(videoId: string) {
  await typesenseQueue.add("upsert-video", {
    videoId,
    calculateScores: true,
  });
}

// Worker processes the queue
const worker = new Worker(
  "typesense-sync",
  async (job) => {
    if (job.name === "upsert-video") {
      await upsertVideoToTypesense(
        job.data.videoId,
        { calculateScores: job.data.calculateScores }
      );
    }
  },
  { connection: redisConnection }
);
```

## Initial Setup

When setting up Typesense for the first time:

```typescript
import { syncAllVideosToTypesense } from "@/server/typesense/utils";
import { typesense } from "@/server/typesense/client";
import { videosV1 } from "@/server/typesense/schemas/videos";

async function setupTypesense() {
  // 1. Create the collection (if it doesn't exist)
  try {
    await typesense.collections().create(videosV1);
    console.log("✅ Created video_v1 collection");
  } catch (error) {
    console.log("Collection already exists or error:", error);
  }
  
  // 2. Sync all videos
  await syncAllVideosToTypesense();
  
  console.log("✅ Typesense setup complete!");
}

setupTypesense();
```

## Performance Considerations

### When to Calculate Scores

- **Real-time updates** (after mutations): Set `calculateScores: false` for faster updates
- **Periodic batch updates** (cron): Set `calculateScores: true` to refresh trending scores
- **Initial sync**: Set `calculateScores: true` for complete data

### Batch Processing

The `bulkUpsertVideosToTypesense` function processes videos in batches of 10 to:
- Avoid overwhelming the database with parallel queries
- Prevent memory issues with large datasets
- Provide progress updates

### Error Handling

All functions include error handling:
- Non-existent videos return `null` instead of throwing
- 404 errors on delete are ignored (idempotent)
- Bulk operations continue even if individual videos fail

## Monitoring

Add monitoring to track sync health:

```typescript
import { upsertVideoToTypesense } from "@/server/typesense/utils";

async function monitoredUpsert(videoId: string) {
  const startTime = Date.now();
  
  try {
    const result = await upsertVideoToTypesense(videoId);
    const duration = Date.now() - startTime;
    
    // Log to your monitoring service
    console.log(`Video ${videoId} synced in ${duration}ms`);
    
    return result;
  } catch (error) {
    console.error(`Video ${videoId} sync failed:`, error);
    
    // Alert on failures
    // await alertService.notify("Typesense sync failed", { videoId, error });
    
    throw error;
  }
}
```

## Troubleshooting

### Video not appearing in search

1. Check if video is in Typesense:
```typescript
const doc = await typesense
  .collections("video_v1")
  .documents("video_id")
  .retrieve();
console.log(doc);
```

2. Check video status:
```typescript
// Only approved videos should be searchable
console.log(doc.status); // Should be "approved"
```

3. Re-sync the video:
```typescript
await upsertVideoToTypesense("video_id");
```

### Scores not updating

Run the periodic update cron job more frequently or manually update:

```typescript
// Get all videos and recalculate scores
await syncAllVideosToTypesense({ calculateScores: true });
```

### Slow bulk operations

Adjust the batch size in `bulkUpsertVideosToTypesense`:

```typescript
// In upsert-video.ts, change batchSize from 10 to a different value
const batchSize = 20; // Increase for more parallelism (but more DB load)
```

## Next Steps

1. Integrate `upsertVideoToTypesense` in your video mutation routes
2. Set up cron jobs for periodic score updates
3. Test with a small batch of videos first
4. Monitor performance and adjust batch sizes as needed
5. Set up alerts for sync failures

