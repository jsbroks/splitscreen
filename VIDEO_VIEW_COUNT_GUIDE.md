# Video View Count System

This guide explains the denormalized view count system that allows efficient view tracking while managing database size.

## Overview

The video table now includes an optional `viewCount` column that stores a denormalized count of views. This allows you to compress old views from the `videoView` table while maintaining accurate total counts.

**Total Views = `video.viewCount` (archived views) + count from `videoView` table (current views)**

## Schema Changes

### Added to `video` table:
```typescript
viewCount: integer("view_count").default(0)
```

This column stores archived/compressed view counts. When null or 0, no views have been archived yet.

## How It Works

### 1. View Tracking
When a user views a video, the system:
- Creates a new row in the `videoView` table
- Increments the `video.viewCount` column by 1

This ensures the denormalized count stays synchronized with new views.

### 2. View Counting
When calculating total views, the system:
- Takes the base count from `video.viewCount` (or 0 if null)
- Adds the current count from the `videoView` table
- Returns the sum as the total view count

**Locations updated:**
- `src/server/typesense/utils/upsert-video.ts` - Typesense sync
- `src/server/typesense/utils/search-response-mapper.ts` - Search results
- `src/server/api/routers/videos/queries.ts` - Video queries
- `src/server/api/routers/videos/interactions.ts` - View recording

### 3. View Compression
Periodically, you can compress old views to reduce database size:
- Old views are counted and added to `video.viewCount`
- The old `videoView` rows are deleted
- Total view count remains accurate

## Usage

### Applying the Schema Change

1. Generate the migration:
```bash
npx drizzle-kit generate
```

2. Apply the migration:
```bash
npx drizzle-kit migrate
```

### Checking Compression Statistics

Use the admin API to check potential savings:

```typescript
// In your admin panel
const stats = await trpc.admin.getViewCompressionStats.query({
  daysOld: 30 // Check views older than 30 days
});

console.log(stats);
// {
//   daysOld: 30,
//   cutoffDate: Date,
//   totalViews: 1000000,
//   oldViews: 750000,      // Can be compressed
//   recentViews: 250000,   // Will remain in table
//   videosWithOldViews: 5000,
//   potentialSavings: "75.0%"
// }
```

### Compressing Views via Script

Use the provided script to compress views:

```bash
# Show statistics without making changes
npx tsx scripts/compress-video-views.ts --dry-run

# Compress views older than 30 days (default)
CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts

# Compress views older than 90 days
CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts --days=90
```

### Compressing Views via API

Use the admin API endpoint:

```typescript
// In your admin panel
const result = await trpc.admin.compressVideoViews.mutate({
  daysOld: 30,           // Compress views older than 30 days
  videoIds: undefined,   // Optional: specific video IDs
});

console.log(result);
// {
//   success: true,
//   message: "Compressed views for 5000 videos",
//   videosProcessed: 5000,
//   viewsCompressed: 750000,
//   errors: []
// }
```

## Recommended Compression Schedule

We recommend the following compression schedule based on your traffic:

### Low Traffic (< 10k views/day)
- Compress views older than 90 days
- Run monthly

### Medium Traffic (10k - 100k views/day)
- Compress views older than 60 days
- Run bi-weekly

### High Traffic (> 100k views/day)
- Compress views older than 30 days
- Run weekly

### Very High Traffic (> 1M views/day)
- Compress views older than 7-14 days
- Run daily or set up automated cron job

## Setting Up Automated Compression

### Using Cron (Linux/Mac)

Add to your crontab:

```bash
# Run every Sunday at 2 AM - compress views older than 30 days
0 2 * * 0 cd /path/to/project && CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts --days=30 >> /var/log/view-compression.log 2>&1
```

### Using GitHub Actions / CI

```yaml
name: Compress Video Views
on:
  schedule:
    # Run every Sunday at 2 AM UTC
    - cron: '0 2 * * 0'
  workflow_dispatch: # Allow manual trigger

jobs:
  compress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - name: Compress Views
        run: CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts --days=30
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Monitoring

### Database Size
Monitor your `videoView` table size:

```sql
-- Check table size
SELECT 
  pg_size_pretty(pg_total_relation_size('video_view')) as total_size,
  pg_size_pretty(pg_relation_size('video_view')) as table_size,
  (SELECT COUNT(*) FROM video_view) as row_count;
```

### View Count Integrity
Verify view counts are accurate:

```sql
-- Compare denormalized count vs actual count
SELECT 
  v.id,
  v.view_count as denormalized_count,
  COUNT(vv.id) as actual_count,
  COALESCE(v.view_count, 0) + COUNT(vv.id) as total_count
FROM video v
LEFT JOIN video_view vv ON vv.video_id = v.id
GROUP BY v.id, v.view_count
LIMIT 10;
```

## Troubleshooting

### View counts don't match
If you notice discrepancies in view counts:

1. Check if the migration was applied correctly
2. Verify that new views are incrementing `viewCount`
3. Re-sync videos to Typesense to update search counts

```bash
# Re-sync all videos to Typesense
# This will recalculate all counts from the database
```

### Compression fails
If compression fails:

1. Check the error logs in the script output
2. Verify database connection and permissions
3. Run with smaller batch size for large databases
4. Check for database locks or long-running queries

### Performance issues
If queries are slow after compression:

1. Ensure indexes are in place on `videoView.videoId`
2. Consider increasing batch size for compression
3. Run compression during low-traffic periods
4. Monitor database CPU and memory usage

## Migration Path

If you have existing data:

1. **Apply the schema change** - Adds `viewCount` column (defaults to 0)
2. **Continue normal operation** - New views will increment the counter
3. **Optionally backfill** - Run initial compression to archive all old views
4. **Set up recurring compression** - Choose a schedule based on traffic

### Initial Backfill (Optional)

If you want to compress all existing views immediately:

```bash
# Compress all views older than 1 day (effectively all views)
CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts --days=1

# This will:
# - Move all existing views to viewCount
# - Clear the videoView table
# - Future views will accumulate in the table again
```

## API Reference

### Admin Router Endpoints

#### `admin.getViewCompressionStats`
Query endpoint to get compression statistics.

**Input:**
```typescript
{
  daysOld: number; // Default: 30
}
```

**Output:**
```typescript
{
  daysOld: number;
  cutoffDate: Date;
  totalViews: number;
  oldViews: number;
  recentViews: number;
  videosWithOldViews: number;
  potentialSavings: string; // e.g., "75.0%"
}
```

#### `admin.compressVideoViews`
Mutation endpoint to compress old views.

**Input:**
```typescript
{
  daysOld: number;           // Default: 30
  videoIds?: string[];       // Optional: specific videos
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
  videosProcessed: number;
  viewsCompressed: number;
  errors: Array<{ videoId: string; error: unknown }>;
}
```

## Benefits

1. **Reduced Database Size** - Archive old views while keeping recent ones
2. **Improved Query Performance** - Fewer rows to scan in videoView table
3. **Maintained Accuracy** - Total counts remain accurate
4. **Flexible Retention** - Choose how long to keep detailed view records
5. **Analytics Friendly** - Recent views still available for detailed analysis
6. **Gradual Adoption** - Works with existing data without migration

## Files Changed

- `src/server/db/schema/videos.ts` - Added viewCount column
- `src/server/db/utils/compress-video-views.ts` - Compression utilities
- `src/server/api/routers/admin.ts` - Admin API endpoints
- `src/server/api/routers/videos/interactions.ts` - View increment logic
- `src/server/api/routers/videos/queries.ts` - View count calculation
- `src/server/typesense/utils/upsert-video.ts` - Typesense sync
- `src/server/typesense/utils/search-response-mapper.ts` - Search results
- `scripts/compress-video-views.ts` - CLI compression script

