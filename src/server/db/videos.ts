import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
