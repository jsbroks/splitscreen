# Filtering and Sorting by Featured Creators

Complete guide for querying videos by featured creators in Typesense.

## Overview

The schema supports filtering and sorting videos by both **main creators** and **featured creators**:

- **Main Creator** (single value for ID/username/display name, array for aliases):
  - `creator_id` - Creator ID
  - `creator_username` - Creator username
  - `creator_display_name` - Creator display name
  - `creator_aliases[]` - Creator aliases (array)

- **Featured Creators** (array values):
  - `featured_creator_ids[]` - Array of featured creator IDs
  - `featured_creator_usernames[]` - Array of featured usernames
  - `featured_creator_display_names[]` - Array of featured display names
  - `featured_creator_aliases[]` - Array of all featured creator aliases (flattened)

All creator fields have `facet: true`, enabling efficient filtering, grouping, and aggregation.

## Basic Filtering

### Filter by Main Creator

```typescript
// By creator ID
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && creator_id:=creator_abc123",
    sort_by: "created_at:desc",
    per_page: 20,
  });

// By creator username
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && creator_username:=johndoe",
    sort_by: "popularity_score:desc",
    per_page: 20,
  });
```

### Filter by Featured Creator

```typescript
// Find all videos featuring a specific creator (by ID)
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && featured_creator_ids:=creator_abc123",
    sort_by: "trending_score:desc",
    per_page: 20,
  });

// By featured creator username
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && featured_creator_usernames:=janedoe",
    sort_by: "view_count:desc",
    per_page: 20,
  });
```

### Filter by Main OR Featured Creator

Find videos where a creator appears either as the main creator OR featured:

```typescript
const creatorId = "creator_abc123";

const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: `status:approved && (creator_id:=${creatorId} || featured_creator_ids:=${creatorId})`,
    sort_by: "created_at:desc",
    per_page: 20,
  });
```

### Filter by Multiple Featured Creators (OR)

Find videos featuring ANY of the specified creators:

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && featured_creator_ids:=[creator_1,creator_2,creator_3]",
    sort_by: "popularity_score:desc",
    per_page: 20,
  });
```

### Filter by Multiple Featured Creators (AND)

Find videos featuring ALL of the specified creators:

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && featured_creator_ids:=creator_1 && featured_creator_ids:=creator_2",
    sort_by: "created_at:desc",
    per_page: 20,
  });
```

## Search with Creator Boost

Boost search results that include specific creators (searches usernames, display names, and aliases):

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "skateboarding",
    query_by: "title,description,creator_username,creator_display_name,creator_aliases,featured_creator_usernames,featured_creator_display_names,featured_creator_aliases",
    filter_by: "status:approved",
    sort_by: "_text_match:desc,trending_score:desc",
    per_page: 20,
  });
```

## Search by Creator Alias

Find videos by searching for a creator's alias:

```typescript
// Search for a creator by any of their known aliases
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "ElenaK",  // Searching for a creator alias
    query_by: "creator_aliases,featured_creator_aliases,creator_username,creator_display_name",
    filter_by: "status:approved",
    sort_by: "_text_match:desc,popularity_score:desc",
    per_page: 20,
  });
```

### Filter by Alias

```typescript
// Find videos where main creator has a specific alias
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && creator_aliases:=ElenaK",
    sort_by: "created_at:desc",
    per_page: 20,
  });

// Find videos where any featured creator has a specific alias
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved && featured_creator_aliases:=ElenaK",
    sort_by: "trending_score:desc",
    per_page: 20,
  });
```

## Grouping by Creator

### Group Videos by Main Creator

Show top videos per creator:

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved",
    group_by: "creator_username",
    group_limit: 5, // 5 videos per creator
    sort_by: "popularity_score:desc",
  });

// Access grouped results
for (const group of results.grouped_hits || []) {
  console.log(`Creator: ${group.group_key[0]}`);
  console.log(`Videos: ${group.hits.length}`);
  
  for (const hit of group.hits) {
    console.log(`  - ${hit.document.title}`);
  }
}
```

### Group by Featured Creator

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved",
    group_by: "featured_creator_usernames",
    group_limit: 10,
    sort_by: "view_count:desc",
  });
```

## Faceted Search (Creator Aggregations)

Get counts of videos per creator:

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved",
    facet_by: "creator_username,featured_creator_usernames",
    max_facet_values: 50,
    per_page: 0, // Don't return documents, just facets
  });

// Access facet counts
for (const facet of results.facet_counts || []) {
  console.log(`Field: ${facet.field_name}`);
  
  for (const count of facet.counts) {
    console.log(`  ${count.value}: ${count.count} videos`);
  }
}
```

### Example Output:

```javascript
{
  facet_counts: [
    {
      field_name: "creator_username",
      counts: [
        { value: "johndoe", count: 45 },
        { value: "janedoe", count: 32 },
        { value: "bobsmith", count: 28 },
        // ...
      ]
    },
    {
      field_name: "featured_creator_usernames",
      counts: [
        { value: "alice", count: 67 },
        { value: "charlie", count: 54 },
        { value: "david", count: 41 },
        // ...
      ]
    }
  ]
}
```

## Advanced Queries

### Filter by Creator with Other Conditions

```typescript
// Videos by a creator in a specific category, between 5-30 minutes
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: `
      status:approved && 
      creator_username:=johndoe && 
      category_names:=gaming && 
      duration_seconds:[300..1800]
    `,
    sort_by: "trending_score:desc",
    per_page: 20,
  });
```

### Top Videos Featuring a Creator Duo

```typescript
// Find videos featuring both creator_1 AND creator_2
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: `
      status:approved && 
      featured_creator_usernames:=alice && 
      featured_creator_usernames:=bob
    `,
    sort_by: "popularity_score:desc",
    per_page: 20,
  });
```

### Creator's Trending Videos

```typescript
// Get a creator's currently trending videos
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: `
      status:approved && 
      (creator_id:=${creatorId} || featured_creator_ids:=${creatorId}) &&
      trending_score:>0
    `,
    sort_by: "trending_score:desc",
    per_page: 20,
  });
```

### Creator's Most Engaging Content

```typescript
// Videos with high engagement by a specific creator
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: `
      status:approved && 
      creator_username:=johndoe &&
      view_count:>=1000 &&
      engagement_rate:>=0.05
    `,
    sort_by: "engagement_rate:desc",
    per_page: 20,
  });
```

## TRPC Router Examples

### Get Videos by Creator

```typescript
// src/server/api/routers/creators.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { typesense } from "@/server/typesense/client";

export const creatorsRouter = createTRPCRouter({
  getVideos: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        includeAsMainCreator: z.boolean().default(true),
        includeAsFeaturedCreator: z.boolean().default(true),
        limit: z.number().min(1).max(50).default(20),
        sortBy: z.enum(["recent", "popular", "trending", "views"]).default("recent"),
      })
    )
    .query(async ({ input }) => {
      // Build filter
      const filters = ["status:approved"];
      
      if (input.includeAsMainCreator && input.includeAsFeaturedCreator) {
        filters.push(
          `(creator_id:=${input.creatorId} || featured_creator_ids:=${input.creatorId})`
        );
      } else if (input.includeAsMainCreator) {
        filters.push(`creator_id:=${input.creatorId}`);
      } else if (input.includeAsFeaturedCreator) {
        filters.push(`featured_creator_ids:=${input.creatorId}`);
      }
      
      // Determine sort field
      const sortMap = {
        recent: "created_at:desc",
        popular: "popularity_score:desc",
        trending: "trending_score:desc",
        views: "view_count:desc",
      };
      
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: filters.join(" && "),
          sort_by: sortMap[input.sortBy],
          per_page: input.limit,
        });
      
      return results.hits?.map(hit => hit.document) || [];
    }),

  getStats: publicProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(async ({ input }) => {
      // Get total videos as main creator
      const mainCreatorResults = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: `status:approved && creator_id:=${input.creatorId}`,
          per_page: 0, // Just get count
        });
      
      // Get total videos as featured creator
      const featuredResults = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: `status:approved && featured_creator_ids:=${input.creatorId}`,
          per_page: 0,
        });
      
      return {
        totalAsMainCreator: mainCreatorResults.found,
        totalAsFeatured: featuredResults.found,
        totalVideos: mainCreatorResults.found + featuredResults.found,
      };
    }),

  getTopCollaborators: publicProcedure
    .input(z.object({ creatorId: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      // Get videos where this creator is featured
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: "*",
          query_by: "title",
          filter_by: `status:approved && featured_creator_ids:=${input.creatorId}`,
          facet_by: "creator_username,featured_creator_usernames",
          max_facet_values: 100,
          per_page: 0,
        });
      
      // Aggregate collaborators
      const collaboratorCounts = new Map<string, number>();
      
      for (const facet of results.facet_counts || []) {
        for (const count of facet.counts) {
          if (count.value !== input.creatorId) {
            const current = collaboratorCounts.get(count.value) || 0;
            collaboratorCounts.set(count.value, current + count.count);
          }
        }
      }
      
      // Sort and return top collaborators
      return Array.from(collaboratorCounts.entries())
        .map(([username, count]) => ({ username, videoCount: count }))
        .sort((a, b) => b.videoCount - a.videoCount)
        .slice(0, input.limit);
    }),
});
```

### Search with Creator Filter

```typescript
export const searchRouter = createTRPCRouter({
  videos: publicProcedure
    .input(
      z.object({
        query: z.string(),
        creatorIds: z.array(z.string()).optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const filters = ["status:approved"];
      
      // Add creator filter if provided
      if (input.creatorIds && input.creatorIds.length > 0) {
        const creatorFilter = input.creatorIds
          .map(id => `(creator_id:=${id} || featured_creator_ids:=${id})`)
          .join(" || ");
        filters.push(`(${creatorFilter})`);
      }
      
      const results = await typesense
        .collections("video_v1")
        .documents()
        .search({
          q: input.query,
          query_by: "title,description,tag_names,creator_username,featured_creator_usernames",
          filter_by: filters.join(" && "),
          sort_by: "_text_match:desc,trending_score:desc",
          per_page: input.limit,
        });
      
      return results.hits?.map(hit => hit.document) || [];
    }),
});
```

## UI Integration Examples

### Creator Profile Page

```typescript
"use client";

import { api } from "@/trpc/react";

export default function CreatorProfilePage({ creatorId }: { creatorId: string }) {
  const { data: stats } = api.creators.getStats.useQuery({ creatorId });
  const { data: videos } = api.creators.getVideos.useQuery({
    creatorId,
    sortBy: "popular",
    limit: 24,
  });
  const { data: collaborators } = api.creators.getTopCollaborators.useQuery({
    creatorId,
    limit: 10,
  });
  
  return (
    <div>
      <h1>Creator Profile</h1>
      
      <div className="stats">
        <p>Main Creator: {stats?.totalAsMainCreator} videos</p>
        <p>Featured In: {stats?.totalAsFeatured} videos</p>
        <p>Total: {stats?.totalVideos} videos</p>
      </div>
      
      <section>
        <h2>Popular Videos</h2>
        <VideoGrid videos={videos} />
      </section>
      
      <section>
        <h2>Top Collaborators</h2>
        <ul>
          {collaborators?.map(c => (
            <li key={c.username}>
              {c.username} ({c.videoCount} videos together)
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

### Creator Filter Component

```typescript
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export function CreatorFilter() {
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  
  const { data: videos } = api.search.videos.useQuery({
    query: "*",
    creatorIds: selectedCreators.length > 0 ? selectedCreators : undefined,
  });
  
  return (
    <div>
      <MultiSelectCreator
        value={selectedCreators}
        onChange={setSelectedCreators}
        placeholder="Filter by creators..."
      />
      
      <VideoGrid videos={videos} />
    </div>
  );
}
```

## Performance Tips

1. **Use Creator IDs over usernames** when possible - IDs are more stable and efficient
2. **Cache facet results** - Creator counts change slowly, cache for 10-15 minutes
3. **Index creator arrays properly** - All creator fields have `facet: true` for optimal performance
4. **Limit facet values** - Use `max_facet_values` to control response size
5. **Use grouping for "latest per creator"** - More efficient than separate queries

## Creator Aliases Use Cases

Creator aliases are useful for:

1. **Known-As Names**: "ElenaKoshka" might also be known as "Elena K", "EK", etc.
2. **Stage Names**: Professional vs. personal names
3. **Historical Names**: Previous usernames or rebrandings
4. **Variations**: Different spellings or nicknames

### Search All Creator Identifiers

To search across all ways a creator might be identified:

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "elena",
    query_by: "creator_username,creator_display_name,creator_aliases,featured_creator_usernames,featured_creator_display_names,featured_creator_aliases,title,description",
    filter_by: "status:approved",
    sort_by: "_text_match:desc,popularity_score:desc",
    per_page: 20,
  });
```

This will find videos where:
- The creator's username contains "elena"
- The creator's display name contains "elena"
- Any of the creator's aliases contain "elena"
- The title or description contains "elena"

### Facet by Aliases

Get counts of videos per alias:

```typescript
const results = await typesense
  .collections("video_v1")
  .documents()
  .search({
    q: "*",
    query_by: "title",
    filter_by: "status:approved",
    facet_by: "creator_aliases,featured_creator_aliases",
    max_facet_values: 100,
    per_page: 0,
  });
```

## Summary

**Filter Options:**
- ✅ Main creator (single value)
- ✅ Featured creators (array)
- ✅ Creator aliases (searchable & filterable)
- ✅ Main OR featured (combined)
- ✅ Multiple creators (AND/OR)

**Sort Options:**
- ✅ By recency (`created_at`)
- ✅ By popularity (`popularity_score`)
- ✅ By trending (`trending_score`)
- ✅ By views (`view_count`)
- ✅ By engagement (`engagement_rate`)

**Search Options:**
- ✅ By username
- ✅ By display name
- ✅ By aliases
- ✅ Combined search across all identifiers

**Aggregations:**
- ✅ Group by creator
- ✅ Facet counts per creator
- ✅ Find collaborations
- ✅ Creator statistics
- ✅ Facet by aliases

All creator fields are indexed with `facet: true`, making filtering, grouping, and aggregation highly efficient! 🚀

