import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const videoStatusEnum = pgEnum("video_status", [
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "thumbnail",
  "sprite",
  "vtt",
]);

export const video = pgTable(
  "video",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    originalKey: text("original_key").notNull(), // e.g. originals/<videoId>/upload.mp4
    status: videoStatusEnum("status").notNull().default("uploaded"),
    // Optional metadata
    durationSeconds: integer("duration_seconds"), // set after probe/transcode
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    // Aggregate counters
    viewsCount: integer("views_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    index("videos_user_idx").on(t.userId),
    index("videos_status_idx").on(t.status),
  ],
);

// Per-user view history for videos.
export const videoViewHistory = pgTable(
  "video_view_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("video_view_history_user_video_unique").on(t.userId, t.videoId),
    index("video_view_history_user_idx").on(t.userId),
    index("video_view_history_video_idx").on(t.videoId),
    index("video_view_history_last_viewed_idx").on(t.lastViewedAt),
  ],
);

// Categories a video can belong to (many-to-many).
export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("category_slug_unique").on(t.slug),
    index("category_name_idx").on(t.name),
  ],
);

// Tags for flexible labeling (many-to-many).
export const tag = pgTable(
  "tag",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("tag_slug_unique").on(t.slug),
    index("tag_name_idx").on(t.name),
  ],
);

// Join table: videos ↔ categories
export const videoCategory = pgTable(
  "video_category",
  {
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("video_category_unique").on(t.videoId, t.categoryId),
    index("video_category_video_idx").on(t.videoId),
    index("video_category_category_idx").on(t.categoryId),
  ],
);

// Join table: videos ↔ tags
export const videoTag = pgTable(
  "video_tag",
  {
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("video_tag_unique").on(t.videoId, t.tagId),
    index("video_tag_video_idx").on(t.videoId),
    index("video_tag_tag_idx").on(t.tagId),
  ],
);
