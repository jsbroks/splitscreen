import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "./auth";
import { creator } from "./creators";
import { transcodeQueue } from "./queue";

export const createVideoId = () => nanoid(8);

export const videoStatusEnum = pgEnum("video_status", [
  "in_review",
  "approved",
  "rejected",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "thumbnail",
  "sprite",
  "vtt",
]);

export const reactionTypeEnum = pgEnum("reaction_type", ["like", "dislike"]);

export const video = pgTable("video", {
  id: text("id").primaryKey(),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  originalKey: text("original_key").notNull(), // e.g. originals/<videoId>/upload.mp4
  originalThumbnailKey: text("original_thumbnail_key"), // e.g. originals/<videoId>/thumbnail.jpg

  status: videoStatusEnum("status").notNull().default("in_review"),
  rejectionMessage: text("rejection_message"), // message explaining why video was rejected

  // Optional metadata
  durationSeconds: integer("duration_seconds"), // set after probe/transcode
  sizeBytes: bigint("size_bytes", { mode: "number" }),

  // Denormalized view count for performance (can be used to archive videoView table)
  viewCount: integer("view_count").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),

  externalReference: text("external_reference"),

  deletedAt: timestamp("deleted_at"),
});

export const videoRelations = relations(video, ({ many, one }) => ({
  uploadedBy: one(user, {
    fields: [video.uploadedById],
    references: [user.id],
  }),
  creators: many(videoCreator),
  tags: many(videoTag),
  categories: many(videoCategory),
  views: many(videoView),
  reactions: many(videoReaction),
  transcodeQueue: many(transcodeQueue),
}));

export const creatorRoleEnum = pgEnum("creator_role", [
  "performer",
  "producer",
]);

export const videoCreator = pgTable(
  "video_creator",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => creator.id, { onDelete: "cascade" }),
    role: creatorRoleEnum("role").notNull().default("performer"),
  },
  (t) => [
    uniqueIndex("video_creator_video_id_creator_id_unique").on(
      t.videoId,
      t.creatorId,
      t.role,
    ),
  ],
);

export const videoCreatorRelations = relations(videoCreator, ({ one }) => ({
  video: one(video, {
    fields: [videoCreator.videoId],
    references: [video.id],
  }),
  creator: one(creator, {
    fields: [videoCreator.creatorId],
    references: [creator.id],
  }),
}));

// Per-user/fingerprint view history for videos.
// Either userId or fingerprintId must be set (or both for authenticated users with fingerprints).
export const videoView = pgTable(
  "video_view",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    fingerprintId: text("fingerprint_id"),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // Ensure at least userId or fingerprintId is set
    check(
      "video_view_identity_check",
      sql`${t.userId} IS NOT NULL OR ${t.fingerprintId} IS NOT NULL`,
    ),
  ],
);

export const videoViewRelations = relations(videoView, ({ one }) => ({
  video: one(video, {
    fields: [videoView.videoId],
    references: [video.id],
  }),
  user: one(user, {
    fields: [videoView.userId],
    references: [user.id],
  }),
}));

// Per-user/fingerprint reactions (likes/dislikes) for videos.
// Either userId or fingerprintId must be set (or both for authenticated users with fingerprints).
export const videoReaction = pgTable(
  "video_reaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    fingerprintId: text("fingerprint_id"),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    reactionType: reactionTypeEnum("reaction_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    // Ensure at least userId or fingerprintId is set
    check(
      "video_reaction_identity_check",
      sql`${t.userId} IS NOT NULL OR ${t.fingerprintId} IS NOT NULL`,
    ),

    // Unique per user OR fingerprint per video
    uniqueIndex("video_reaction_user_video_unique").on(t.userId, t.videoId),
    uniqueIndex("video_reaction_fingerprint_video_unique").on(
      t.fingerprintId,
      t.videoId,
    ),
  ],
);

export const videoReactionRelations = relations(videoReaction, ({ one }) => ({
  video: one(video, {
    fields: [videoReaction.videoId],
    references: [video.id],
  }),
  user: one(user, {
    fields: [videoReaction.userId],
    references: [user.id],
  }),
}));

export const tag = pgTable("tag", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const videoTag = pgTable("video_tag", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => video.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tag.id, { onDelete: "cascade" }),
});

export const videoTagRelations = relations(videoTag, ({ one }) => ({
  video: one(video, {
    fields: [videoTag.videoId],
    references: [video.id],
  }),
  tag: one(tag, {
    fields: [videoTag.tagId],
    references: [tag.id],
  }),
}));

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const videoCategory = pgTable("video_category", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => video.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => category.id, { onDelete: "cascade" }),
});

export const videoCategoryRelations = relations(videoCategory, ({ one }) => ({
  video: one(video, {
    fields: [videoCategory.videoId],
    references: [video.id],
  }),
  category: one(category, {
    fields: [videoCategory.categoryId],
    references: [category.id],
  }),
}));

export const reportReasonEnum = pgEnum("report_reason", [
  "underage_content",
  "abuse",
  "illegal_content",
  "wrong_tags",
  "spam_unrelated",
  "dmca",
  "other",
]);

export const videoReport = pgTable("video_report", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => video.id, { onDelete: "cascade" }),
  reportedById: text("reported_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  fingerprintId: text("fingerprint_id"),
  reasons: reportReasonEnum("reasons").array().notNull(),
  details: text("details").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoReportRelations = relations(videoReport, ({ one }) => ({
  video: one(video, {
    fields: [videoReport.videoId],
    references: [video.id],
  }),
  reportedBy: one(user, {
    fields: [videoReport.reportedById],
    references: [user.id],
  }),
}));
