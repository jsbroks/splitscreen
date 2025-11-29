# Typesense Quick Reference

## 📦 Installation Complete

Your Typesense video search system is ready to use! Here's everything you need:

## 🗂️ Files Created

```
src/server/typesense/
├── schemas/
│   └── videos.ts                    # Enhanced schema with discovery fields
├── utils/
│   ├── index.ts                     # Main exports
│   ├── video-scoring.ts             # Score calculation functions
│   ├── video-discovery.ts           # Query builder functions
│   └── upsert-video.ts             # Database → Typesense sync
scripts/
└── sync-typesense.ts                # CLI tool for syncing
```

## ⚡ Quick Start

### 1. Upsert a Video

```typescript
import { upsertVideoToTypesense } from "@/server/typesense/utils";

// After creating/updating a video in your database
await upsertVideoToTypesense(videoId);
```

### 2. Query for Trending Videos

```typescript
import { typesense } from "@/server/typesense/client";
import { getTrendingVideosQuery } from "@/server/typesense/utils";

const query = getTrendingVideosQuery(20);
const results = await typesense
  .collections("video_v1")
  .documents()
  .search(query);

const videos = results.hits?.map(hit => hit.document) || [];
```

### 3. Get Related Videos

```typescript
import { getRelatedVideosByAttributesQuery } from "@/server/typesense/utils";

const referenceVideo = await typesense
  .collections("video_v1")
  .documents(videoId)
  .retrieve();

const query = getRelatedVideosByAttributesQuery(referenceVideo, true, 12);
const results = await typesense
  .collections("video_v1")
  .documents()
  .search(query);
```

## 🔧 CLI Commands

```bash
# Sync all videos
pnpm tsx scripts/sync-typesense.ts sync-all

# Sync a specific video
pnpm tsx scripts/sync-typesense.ts sync-video VIDEO_ID

# Sync recently active videos (last 24h)
pnpm tsx scripts/sync-typesense.ts sync-recent

# Sync only approved videos
pnpm tsx scripts/sync-typesense.ts sync-approved

# Delete a video from Typesense
pnpm tsx scripts/sync-typesense.ts delete VIDEO_ID

# Show help
pnpm tsx scripts/sync-typesense.ts help
```

## 📊 Schema Fields Reference

### Searchable Text
- `title` - Video title
- `description` - Video description

### Creators (filterable + groupable)
- `creator_id`, `creator_username`, `creator_display_name` - Main creator
- `creator_aliases[]` - Main creator aliases
- `featured_creator_ids[]`, `featured_creator_usernames[]`, `featured_creator_display_names[]` - Featured creators
- `featured_creator_aliases[]` - Featured creator aliases (flattened)

### Uploader (filterable + groupable)
- `uploaded_by_id`, `uploaded_by_username` - User who uploaded the video

### Tags & Categories (filterable + groupable)
- `tag_ids[]`, `tag_names[]`, `tag_slugs[]` - Tags
- `category_ids[]`, `category_names[]`, `category_slugs[]` - Categories

### Metrics
- `duration_seconds` - Video length (filterable)
- `view_count`, `like_count`, `dislike_count` - Engagement
- `views_last_24h`, `views_last_7d` - Recent views
- `likes_last_24h`, `likes_last_7d` - Recent likes

### Discovery Scores
- `popularity_score` - All-time popularity
- `trending_score` - Time-weighted trending score
- `engagement_rate` - Quality metric (likes/views)

### Video Quality & Processing
- `width`, `height` - Video dimensions (pixels)
- `has_thumbnail` - Whether video has a thumbnail
- `is_transcoded` - Whether video is fully transcoded
- `transcode_status` - Transcode status (queued, running, done, failed)

### Moderation
- `report_count` - Number of reports on this video
- `has_active_reports` - Whether video has unarchived reports

### Metadata
- `status` - Video status (approved, processing, etc.)
- `created_at`, `updated_at` - Timestamps (Unix)

## 🔍 Common Queries

### Search Everything

```typescript
const results = await typesense.collections("video_v1").documents().search({
  q: "skateboarding",
  query_by: "title,description,tag_names,creator_username,creator_display_name,creator_aliases,featured_creator_usernames,featured_creator_display_names,featured_creator_aliases",
  filter_by: "status:approved",
  sort_by: "trending_score:desc",
  per_page: 20,
});
```

### Search by Creator (including aliases)

```typescript
const results = await typesense.collections("video_v1").documents().search({
  q: "Elena",
  query_by: "creator_username,creator_display_name,creator_aliases,featured_creator_usernames,featured_creator_display_names,featured_creator_aliases",
  filter_by: "status:approved",
  sort_by: "popularity_score:desc",
  per_page: 20,
});
```

### Filter by Tag

```typescript
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && tag_names:=gaming",
  sort_by: "popularity_score:desc",
  per_page: 20,
});
```

### Filter by Video Length

```typescript
// Videos between 5-30 minutes (300-1800 seconds)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && duration_seconds:[300..1800]",
  sort_by: "created_at:desc",
  per_page: 20,
});
```

### Filter by Uploader

```typescript
// Videos uploaded by a specific user
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && uploaded_by_id:=user_abc123",
  sort_by: "created_at:desc",
  per_page: 20,
});
```

### Filter by Processing Status

```typescript
// Only fully transcoded videos
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && is_transcoded:true",
  sort_by: "trending_score:desc",
  per_page: 20,
});

// Videos with thumbnails
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && has_thumbnail:true",
  sort_by: "created_at:desc",
  per_page: 20,
});
```

### Filter by Moderation Status

```typescript
// Videos without active reports
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && has_active_reports:false",
  sort_by: "popularity_score:desc",
  per_page: 20,
});

// Videos with fewer than 5 reports
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && report_count:<5",
  sort_by: "created_at:desc",
  per_page: 20,
});
```

### Group by Creator

```typescript
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved",
  group_by: "creator_username",
  group_limit: 5, // 5 videos per creator
});
```

### Faceted Search (Get Counts)

```typescript
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved",
  facet_by: "tag_names,creator_username,duration_seconds",
  max_facet_values: 20,
});

// Access facet counts
console.log(results.facet_counts);
```

## 🔄 Integration Points

### After Video Upload

```typescript
// In your upload mutation
export const uploadVideo = protectedProcedure
  .input(uploadSchema)
  .mutation(async ({ ctx, input }) => {
    // 1. Create video in database
    const video = await ctx.db.insert(schema.video).values({
      ...input,
    }).returning();
    
    // 2. Sync to Typesense (non-blocking)
    upsertVideoToTypesense(video.id).catch(console.error);
    
    return video;
  });
```

### After Status Change (Approval)

```typescript
// When approving a video
export const approveVideo = protectedProcedure
  .input(z.object({ videoId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Update in database
    await ctx.db
      .update(schema.video)
      .set({ status: "approved" })
      .where(eq(schema.video.id, input.videoId));
    
    // 2. Sync to Typesense so it appears in search
    await upsertVideoToTypesense(input.videoId);
    
    return { success: true };
  });
```

### After Tag/Creator Update

```typescript
// When updating tags or featured creators
export const updateVideoTags = protectedProcedure
  .input(updateTagsSchema)
  .mutation(async ({ ctx, input }) => {
    // 1. Update tags in database
    await updateTagsInDatabase(input.videoId, input.tagIds);
    
    // 2. Sync to Typesense (affects filtering and search)
    await upsertVideoToTypesense(input.videoId);
    
    return { success: true };
  });
```

### After Video Deletion

```typescript
// When soft-deleting a video
export const deleteVideo = protectedProcedure
  .input(z.object({ videoId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Soft delete in database
    await ctx.db
      .update(schema.video)
      .set({ deletedAt: new Date() })
      .where(eq(schema.video.id, input.videoId));
    
    // 2. Remove from Typesense
    await deleteVideoFromTypesense(input.videoId);
    
    return { success: true };
  });
```

## ⏱️ Cron Jobs

### Update Trending Scores (Every 15 Minutes)

```typescript
import cron from "node-cron";

cron.schedule("*/15 * * * *", async () => {
  // Get videos with activity in last 24h
  const activeVideos = await getRecentlyActiveVideoIds();
  
  // Update their scores
  await bulkUpsertVideosToTypesense(activeVideos, {
    calculateScores: true,
  });
});
```

### Daily Full Sync (3 AM)

```typescript
cron.schedule("0 3 * * *", async () => {
  await syncAllVideosToTypesense();
});
```

## 🎯 Discovery Router Example

```typescript
// src/server/api/routers/discovery.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { typesense } from "@/server/typesense/client";
import { 
  getTrendingVideosQuery,
  getPopularVideosQuery,
  getRelatedVideosByAttributesQuery
} from "@/server/typesense/utils";

export const discoveryRouter = createTRPCRouter({
  trending: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const query = getTrendingVideosQuery(input.limit);
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search(query);
      return results.hits?.map(hit => hit.document) || [];
    }),

  popular: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const query = getPopularVideosQuery(input.limit);
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search(query);
      return results.hits?.map(hit => hit.document) || [];
    }),

  related: publicProcedure
    .input(z.object({ 
      videoId: z.string(),
      limit: z.number().default(12) 
    }))
    .query(async ({ input }) => {
      const video = await typesense
        .collections("video_v1")
        .documents(input.videoId)
        .retrieve();
      
      const query = getRelatedVideosByAttributesQuery(
        video,
        true,
        input.limit
      );
      
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search(query);
      
      return results.hits?.map(hit => hit.document) || [];
    }),
});
```

## 📚 Full Documentation

- **Schema Details**: See `TYPESENSE_DISCOVERY_GUIDE.md`
- **Upsert Patterns**: See `TYPESENSE_UPSERT_GUIDE.md`
- **Creator Filtering**: See `TYPESENSE_CREATOR_FILTERING.md`
- **Advanced Filtering**: See `TYPESENSE_FILTERING_GUIDE.md`
- **Code**: See `src/server/typesense/utils/`

## 🚀 Next Steps

1. **Initial Setup**: Run `pnpm tsx scripts/sync-typesense.ts sync-all`
2. **Test Queries**: Try trending/popular/related queries
3. **Integrate**: Add upsert calls to your video mutations
4. **Cron Jobs**: Set up periodic score updates
5. **Monitor**: Watch query performance in Typesense dashboard

## 💡 Tips

- Cache query results for 5-15 minutes (trending changes slowly)
- Update Typesense after important changes (approval, tags, deletion)
- Use bulk operations for large syncs
- Set `calculateScores: false` for real-time updates (update scores in cron)
- Use facets to build dynamic filters in your UI
- Group by creator/tag for organized discovery pages

## 🐛 Debugging

```typescript
// Check if video is in Typesense
const doc = await typesense
  .collections("video_v1")
  .documents("VIDEO_ID")
  .retrieve();
console.log(doc);

// Re-sync if needed
await upsertVideoToTypesense("VIDEO_ID");

// Check collection stats
const collection = await typesense
  .collections("video_v1")
  .retrieve();
console.log(collection.num_documents);
```

---

**Questions?** Check the full guides or the inline code documentation!

