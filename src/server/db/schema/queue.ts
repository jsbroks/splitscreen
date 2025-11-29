import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { video } from "./videos";

export const queueStatusEnum = pgEnum("queue_status", [
  "queued",
  "running",
  "done",
  "failed",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);

export const transcodeQueue = pgTable(
  "transcode_queue",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),

    // Object storage key for original input (e.g., originals/<videoId>/upload.mp4)
    inputKey: text("input_key").notNull(),
    // Destination prefix to write outputs under (e.g., hls/<videoId>/)
    outputPrefix: text("output_prefix").notNull(),
    status: queueStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),

    hlsStatus: processingStatusEnum("hls_status").notNull().default("pending"),
    posterStatus: processingStatusEnum("poster_status")
      .notNull()
      .default("pending"),
    scrubberPreviewStatus: processingStatusEnum("scrubber_preview_status")
      .notNull()
      .default("pending"),
    hoverPreviewStatus: processingStatusEnum("hover_preview_status")
      .notNull()
      .default("pending"),
  },
  (t) => [
    index("transcode_queue_video_idx").on(t.videoId),
    index("transcode_queue_status_idx").on(t.status),
    index("transcode_queue_created_idx").on(t.createdAt),
  ],
);

export const transcodeQueueRelations = relations(transcodeQueue, ({ one }) => ({
  video: one(video, {
    fields: [transcodeQueue.videoId],
    references: [video.id],
  }),
}));
