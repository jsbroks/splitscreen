# Implementation Summary: Video View Count System

## Overview
Added an optional denormalized `viewCount` column to the `video` table that allows compressing the `videoView` table while maintaining accurate view counts.

**Formula:** Total Views = `video.viewCount` + count from `videoView` table

## Changes Made

### 1. Database Schema (`src/server/db/schema/videos.ts`)
- Added `viewCount: integer("view_count").default(0)` to the `video` table
- This column stores archived/compressed views

### 2. View Recording (`src/server/api/routers/videos/interactions.ts`)
- When a new view is recorded, the `viewCount` is automatically incremented
- Uses `COALESCE` to handle null values: `COALESCE(viewCount, 0) + 1`
- Ensures the denormalized count stays in sync with new views

### 3. View Count Calculation (Multiple Files)

#### `src/server/typesense/utils/upsert-video.ts`
- Updated to calculate: `baseViewCount + currentViewCount`
- Used when syncing videos to Typesense for search

#### `src/server/typesense/utils/search-response-mapper.ts`
- Updated to calculate total views for search results
- Efficiently batches view counts for multiple videos

#### `src/server/api/routers/videos/queries.ts`
- Updated `getVideo` query to return total views
- Calculates: `baseViewCount + currentViewCount`

### 4. Compression Utilities (`src/server/db/utils/compress-video-views.ts`)
New utility functions:

- `compressOldVideoViews()` - Compresses views older than a specified date
- `getViewCompressionStats()` - Returns statistics about potential compression
- Includes transaction safety and batch processing

### 5. Admin API (`src/server/api/routers/admin.ts`)
New admin-only endpoints:

- `admin.getViewCompressionStats` - Query compression statistics
- `admin.compressVideoViews` - Trigger view compression

### 6. CLI Script (`scripts/compress-video-views.ts`)
New script for command-line compression:

```bash
# Dry run
npx tsx scripts/compress-video-views.ts --dry-run

# Compress views older than 30 days
CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts

# Compress views older than 90 days
CONFIRM_COMPRESS=yes npx tsx scripts/compress-video-views.ts --days=90
```

### 7. Router Registration (`src/server/api/root.ts`)
- Added `admin` router to the main app router

### 8. Documentation
- `VIDEO_VIEW_COUNT_GUIDE.md` - Comprehensive usage guide
- `IMPLEMENTATION_SUMMARY.md` - This file

## Migration Steps

1. **Generate Migration:**
   ```bash
   npx drizzle-kit generate
   ```

2. **Apply Migration:**
   ```bash
   npx drizzle-kit migrate
   ```

3. **Verify Schema:**
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'video' AND column_name = 'view_count';
   ```

## Testing Checklist

- [ ] Schema migration applied successfully
- [ ] New views increment `viewCount` correctly
- [ ] View counts display correctly in UI
- [ ] Typesense sync includes correct view counts
- [ ] Search results show correct view counts
- [ ] Compression stats API returns data
- [ ] Compression runs without errors
- [ ] Total view counts remain accurate after compression

## Backwards Compatibility

✅ **Fully backwards compatible**
- Existing code continues to work
- `viewCount` defaults to 0 (equivalent to "no compressed views")
- All queries gracefully handle null values with `COALESCE`
- No data loss or migration required

## Performance Impact

### Positive Impacts
- ✅ Reduced `videoView` table size after compression
- ✅ Faster queries on `videoView` table (fewer rows)
- ✅ Reduced database storage costs
- ✅ Improved index performance

### Considerations
- ⚠️ Slight overhead on each view recording (one additional UPDATE)
- ⚠️ Compression script requires database resources during execution
- 💡 Run compression during low-traffic periods

## Monitoring Recommendations

1. **Database Size:**
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('video_view'));
   ```

2. **View Count Integrity:**
   ```sql
   SELECT 
     v.id,
     v.title,
     COALESCE(v.view_count, 0) as archived_views,
     COUNT(vv.id) as current_views,
     COALESCE(v.view_count, 0) + COUNT(vv.id) as total_views
   FROM video v
   LEFT JOIN video_view vv ON vv.video_id = v.id
   GROUP BY v.id
   ORDER BY total_views DESC
   LIMIT 10;
   ```

3. **Compression Stats:**
   ```typescript
   const stats = await trpc.admin.getViewCompressionStats.query({ daysOld: 30 });
   ```

## Rollback Plan

If needed, you can rollback:

1. **Remove the column** (loses compressed counts):
   ```sql
   ALTER TABLE video DROP COLUMN view_count;
   ```

2. **Revert code changes** (if column still exists, just stop using it):
   - View counts will still work (just won't include compressed counts)
   - Column can remain in database without issues

## Next Steps

1. Apply the schema migration
2. Test in staging/development environment
3. Monitor view count accuracy
4. Set up compression schedule based on traffic
5. Configure monitoring and alerts

## Support

For issues or questions:
- Check `VIDEO_VIEW_COUNT_GUIDE.md` for detailed usage
- Review error logs from compression script
- Verify database schema with `drizzle-kit`
- Test in non-production environment first

