# Comprehensive Filtering Guide

Complete guide to all available filters in the Typesense video schema.

## Filter Categories

### 1. Uploader Filters

Filter videos by who uploaded them (different from creator - the person IN the video).

```typescript
// By uploader ID
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && uploaded_by_id:=user_abc123",
  sort_by: "created_at:desc",
  per_page: 20,
});

// By uploader username
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && uploaded_by_username:=johndoe",
  sort_by: "created_at:desc",
  per_page: 20,
});

// User's upload history
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: `uploaded_by_id:=${userId}`,
  sort_by: "created_at:desc",
  per_page: 50,
});
```

**Use Cases:**
- User profile pages showing their uploads
- "My Uploads" section
- Moderation (review all uploads from a user)
- Ban a user's content

### 2. Processing/Quality Filters

Filter by video processing status and quality indicators.

```typescript
// Only fully transcoded (ready to watch)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && is_transcoded:true",
  sort_by: "trending_score:desc",
  per_page: 20,
});

// Only videos with thumbnails
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && has_thumbnail:true",
  sort_by: "popularity_score:desc",
  per_page: 20,
});

// By transcode status
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "transcode_status:done",
  sort_by: "created_at:desc",
  per_page: 20,
});

// Failed transcodes (admin view)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "transcode_status:failed",
  sort_by: "created_at:desc",
  per_page: 50,
});

// Processing videos
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "transcode_status:[queued,running]",
  sort_by: "created_at:asc",
  per_page: 50,
});
```

**Available Transcode Statuses:**
- `queued` - Waiting to be processed
- `running` - Currently processing
- `done` - Successfully transcoded
- `failed` - Transcoding failed

**Use Cases:**
- Show only ready-to-watch videos to users
- Admin dashboard for failed transcodes
- Processing queue monitoring
- Quality control

### 3. Video Dimensions Filters

Filter by video dimensions (when available).

```typescript
// Specific width
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && width:=1920",
  sort_by: "created_at:desc",
  per_page: 20,
});

// Width range (HD videos)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && width:[1280..1920]",
  sort_by: "popularity_score:desc",
  per_page: 20,
});

// Videos with dimensions set
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && width:>0 && height:>0",
  sort_by: "created_at:desc",
  per_page: 20,
});
```

**Note:** Width/height fields are optional and may not be populated yet. You can add these to your video database schema and the upsert function will sync them.

**Use Cases:**
- Filter by resolution (4K, HD, SD)
- Device-specific content (vertical vs horizontal)
- Quality tiers

### 4. Moderation Filters

Filter by report status and moderation metrics.

```typescript
// Videos without active reports (clean content)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "status:approved && has_active_reports:false",
  sort_by: "popularity_score:desc",
  per_page: 20,
});

// Videos with active reports (moderation queue)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "has_active_reports:true",
  sort_by: "report_count:desc",
  per_page: 50,
});

// Videos with many reports (priority review)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "report_count:>=5",
  sort_by: "report_count:desc",
  per_page: 50,
});

// Videos with few reports (low priority)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "report_count:[1..4]",
  sort_by: "created_at:desc",
  per_page: 50,
});

// Reported but archived (resolved)
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: "report_count:>0 && has_active_reports:false",
  sort_by: "created_at:desc",
  per_page: 50,
});
```

**Use Cases:**
- Moderation dashboard
- Auto-hide heavily reported content
- Priority review queue
- Content safety features
- User trust & safety

### 5. Combined Filters

Powerful combinations of multiple filters.

```typescript
// Clean, ready-to-watch content only
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: `
    status:approved && 
    is_transcoded:true && 
    has_thumbnail:true &&
    has_active_reports:false
  `,
  sort_by: "trending_score:desc",
  per_page: 20,
});

// User's successfully processed uploads
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: `
    uploaded_by_id:=${userId} && 
    status:approved &&
    is_transcoded:true
  `,
  sort_by: "created_at:desc",
  per_page: 50,
});

// High-quality content from specific creator
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: `
    creator_id:=${creatorId} &&
    status:approved &&
    is_transcoded:true &&
    has_thumbnail:true &&
    view_count:>=1000 &&
    engagement_rate:>=0.05
  `,
  sort_by: "popularity_score:desc",
  per_page: 20,
});

// Videos needing attention
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  filter_by: `
    (transcode_status:failed || has_active_reports:true) &&
    status:!=rejected
  `,
  sort_by: "created_at:desc",
  per_page: 50,
});
```

## TRPC Router Examples

### User Profile - Uploaded Videos

```typescript
export const profileRouter = createTRPCRouter({
  myUploads: protectedProcedure
    .input(
      z.object({
        status: z.enum(["all", "approved", "processing", "rejected"]).default("all"),
        limit: z.number().default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = [`uploaded_by_id:=${ctx.session.user.id}`];
      
      if (input.status !== "all") {
        filters.push(`status:=${input.status}`);
      }
      
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: filters.join(" && "),
          sort_by: "created_at:desc",
          per_page: input.limit,
        });
      
      return results.hits?.map(hit => hit.document) || [];
    }),
});
```

### Moderation Dashboard

```typescript
export const moderationRouter = createTRPCRouter({
  reportedVideos: protectedProcedure
    .input(
      z.object({
        priority: z.enum(["high", "medium", "low", "all"]).default("all"),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      let filter_by = "has_active_reports:true";
      
      // Priority filtering
      if (input.priority === "high") {
        filter_by += " && report_count:>=10";
      } else if (input.priority === "medium") {
        filter_by += " && report_count:[5..9]";
      } else if (input.priority === "low") {
        filter_by += " && report_count:[1..4]";
      }
      
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by,
          sort_by: "report_count:desc,created_at:desc",
          per_page: input.limit,
        });
      
      return results.hits?.map(hit => hit.document) || [];
    }),

  failedTranscodes: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: "transcode_status:failed",
          sort_by: "created_at:desc",
          per_page: 100,
        });
      
      return results.hits?.map(hit => hit.document) || [];
    }),
});
```

### Quality Control

```typescript
export const qualityRouter = createTRPCRouter({
  readyToWatch: publicProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: `
            status:approved && 
            is_transcoded:true && 
            has_thumbnail:true &&
            has_active_reports:false
          `,
          sort_by: "trending_score:desc",
          per_page: input.limit,
        });
      
      return results.hits?.map(hit => hit.document) || [];
    }),
});
```

## Faceted Filtering

Get counts for filter options:

```typescript
// Get counts by processing status
const results = await typesense.collections("video_v1").documents().search({
  q: "*",
  query_by: "title",
  facet_by: "transcode_status,has_thumbnail,is_transcoded,has_active_reports,uploaded_by_username",
  max_facet_values: 100,
  per_page: 0,
});

// Example output
{
  facet_counts: [
    {
      field_name: "transcode_status",
      counts: [
        { value: "done", count: 1543 },
        { value: "queued", count: 23 },
        { value: "running", count: 5 },
        { value: "failed", count: 12 },
      ]
    },
    {
      field_name: "has_thumbnail",
      counts: [
        { value: "true", count: 1520 },
        { value: "false", count: 63 },
      ]
    },
    {
      field_name: "has_active_reports",
      counts: [
        { value: "false", count: 1550 },
        { value: "true", count: 33 },
      ]
    }
  ]
}
```

## Best Practices

### 1. Always Filter for User-Facing Content

```typescript
// Good - only show ready content
filter_by: "status:approved && is_transcoded:true && has_active_reports:false"

// Bad - might show processing or reported videos
filter_by: "status:approved"
```

### 2. Uploader vs Creator

Remember the distinction:
- `uploaded_by_id` - The user account that uploaded the video
- `creator_id` - The person/creator featured IN the video

Use `uploaded_by_id` for user profiles, `creator_id` for creator pages.

### 3. Moderation Priority

```typescript
// High priority (10+ reports)
filter_by: "has_active_reports:true && report_count:>=10"

// Medium priority (5-9 reports)
filter_by: "has_active_reports:true && report_count:[5..9]"

// Low priority (1-4 reports)
filter_by: "has_active_reports:true && report_count:[1..4]"
```

### 4. Processing Pipeline

```typescript
// Show users only completed videos
filter_by: "status:approved && is_transcoded:true"

// Admin view of processing queue
filter_by: "transcode_status:[queued,running]"

// Retry failed transcodes
filter_by: "transcode_status:failed && status:!=rejected"
```

## Summary

**New Filter Fields:**

✅ **Uploader**: `uploaded_by_id`, `uploaded_by_username`
- Who uploaded the video (different from creator)

✅ **Processing**: `is_transcoded`, `has_thumbnail`, `transcode_status`
- Quality and readiness indicators

✅ **Dimensions**: `width`, `height`
- Video resolution (when available)

✅ **Moderation**: `report_count`, `has_active_reports`
- Content safety and moderation metrics

All fields are properly indexed with facets where appropriate for efficient filtering and aggregation! 🚀

