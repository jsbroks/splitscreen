import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

export const videosV1: CollectionCreateSchema = {
  name: "video_v1",
  fields: [
    // Primary identifiers
    { name: "id", type: "string" },

    // Searchable text fields
    { name: "title", type: "string" },
    { name: "description", type: "string", optional: true },

    // Creator information (for filtering and grouping)
    { name: "creator_id", type: "string", optional: true, facet: true },
    { name: "creator_username", type: "string", optional: true, facet: true },
    {
      name: "creator_display_name",
      type: "string",
      optional: true,
      facet: true,
    },
    {
      name: "creator_aliases",
      type: "string[]",
      optional: true,
      facet: true,
    },

    // Featured creators (array for multiple creators per video)
    {
      name: "featured_creator_ids",
      type: "string[]",
      optional: true,
      facet: true,
    },
    {
      name: "featured_creator_usernames",
      type: "string[]",
      optional: true,
      facet: true,
    },
    {
      name: "featured_creator_display_names",
      type: "string[]",
      optional: true,
      facet: true,
    },
    {
      name: "featured_creator_aliases",
      type: "string[]",
      optional: true,
      facet: true,
    },

    // Tags (for filtering and grouping)
    { name: "tag_ids", type: "string[]", optional: true, facet: true },
    { name: "tag_names", type: "string[]", optional: true, facet: true },
    { name: "tag_slugs", type: "string[]", optional: true, facet: true },

    // Categories (for filtering and grouping)
    { name: "category_ids", type: "string[]", optional: true, facet: true },
    { name: "category_names", type: "string[]", optional: true, facet: true },
    { name: "category_slugs", type: "string[]", optional: true, facet: true },

    // Uploader information (who uploaded the video)
    { name: "uploaded_by_id", type: "string", facet: true },
    {
      name: "uploaded_by_username",
      type: "string",
      optional: true,
      facet: true,
    },

    // Video metadata (for filtering and sorting)
    { name: "average_watch_duration_seconds", type: "int32", optional: true },
    { name: "duration_seconds", type: "int32", optional: true, facet: true },
    { name: "status", type: "string", facet: true }, // processing, approved, etc.

    // Video dimensions
    { name: "width", type: "int32", optional: true },
    { name: "height", type: "int32", optional: true },

    // Processing/Quality flags
    { name: "has_thumbnail", type: "bool", optional: true, facet: true },
    { name: "is_transcoded", type: "bool", optional: true, facet: true },
    { name: "transcode_status", type: "string", optional: true, facet: true }, // queued, processing, complete, failed

    // Report/Moderation metrics
    { name: "report_count", type: "int32", optional: true },
    { name: "has_active_reports", type: "bool", optional: true, facet: true },

    // Engagement metrics (for sorting by popularity)
    { name: "view_count", type: "int32", optional: true },
    { name: "like_count", type: "int32", optional: true },
    { name: "dislike_count", type: "int32", optional: true },

    // Calculated scores for discovery
    { name: "popularity_score", type: "float", optional: true }, // Overall popularity (views + likes)
    { name: "trending_score", type: "float", optional: true }, // Time-weighted popularity
    { name: "engagement_rate", type: "float", optional: true }, // likes / views ratio

    // Recent engagement (for trending calculation)
    { name: "views_last_24h", type: "int32", optional: true },
    { name: "views_last_7d", type: "int32", optional: true },
    { name: "likes_last_24h", type: "int32", optional: true },
    { name: "likes_last_7d", type: "int32", optional: true },

    // Vector embedding for semantic similarity (related content)
    // 384 dimensions for all-MiniLM-L6-v2 or similar model
    {
      name: "title_embedding",
      type: "float[]",
      embed: {
        from: ["title", "description"],
        model_config: {
          model_name: "ts/all-MiniLM-L12-v2",
        },
      },
      optional: true,
    },

    // Timestamps (for sorting by recency)
    { name: "created_at", type: "int64" }, // Unix timestamp
    { name: "updated_at", type: "int64" }, // Unix timestamp
  ],
  default_sorting_field: "created_at",
};

export type VideoV1 = {
  id: string;
  title: string;
  description?: string;
  creator_id?: string;
  creator_username?: string;
  creator_display_name?: string;
  creator_aliases?: string[];
  featured_creator_ids?: string[];
  featured_creator_usernames?: string[];
  featured_creator_display_names?: string[];
  featured_creator_aliases?: string[];
  tag_ids?: string[];
  tag_names?: string[];
  tag_slugs?: string[];
  category_ids?: string[];
  category_names?: string[];
  category_slugs?: string[];
  uploaded_by_id: string;
  uploaded_by_username?: string;
  average_watch_duration_seconds?: number;
  duration_seconds?: number;
  status: string;
  width?: number;
  height?: number;
  has_thumbnail?: boolean;
  is_transcoded?: boolean;
  transcode_status?: string;
  report_count?: number;
  has_active_reports?: boolean;
  view_count?: number;
  like_count?: number;
  dislike_count?: number;
  popularity_score?: number;
  trending_score?: number;
  engagement_rate?: number;
  views_last_24h?: number;
  views_last_7d?: number;
  likes_last_24h?: number;
  likes_last_7d?: number;
  title_embedding?: number[];
  created_at: number;
  updated_at: number;
};
