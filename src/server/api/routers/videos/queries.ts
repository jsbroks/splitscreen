import { z } from "zod";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  type SQL,
  takeFirst,
} from "~/server/db";
import * as schema from "~/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { buildVideoUrls } from "../../utils/video-urls";

/**
 * Router for querying video data
 */
export const videoQueriesRouter = createTRPCRouter({
  getVideo: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.query.video.findFirst({
        where: and(
          eq(schema.video.id, input.videoId),
          isNull(schema.video.deletedAt),
        ),
        with: {
          transcodeQueue: {
            orderBy: [asc(schema.transcodeQueue.createdAt)],
          },
          uploadedBy: true,
          tags: {
            with: {
              tag: true,
            },
          },
          featuredCreators: {
            with: {
              creator: true,
            },
          },
        },
      });

      if (!video) {
        return null;
      }

      const views = await ctx.db
        .select({ count: count() })
        .from(schema.videoView)
        .where(eq(schema.videoView.videoId, input.videoId))
        .then(takeFirst);

      const transcode = video?.transcodeQueue[0];
      const urls = buildVideoUrls(video, transcode);

      return {
        ...video,
        thumbnailUrl: urls.thumbnailUrl,
        videoUrl: urls.videoUrl,
        transcode: {
          ...(transcode ?? {}),
          hlsSource: urls.hlsSource,
          hoverPreviewMp4: urls.hoverPreviewMp4,
          hoverPreviewWebm: urls.hoverPreviewWebm,
          thumbnailsVtt: urls.thumbnailsVtt,
        },
        views: views?.count ?? 0,
      };
    }),

  videos: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.number().nullish(),
        direction: z.enum(["forward", "backward"]),

        uploadedById: z.string().optional(),

        tags: z.array(z.string()).optional(),
        status: z
          .enum([
            "uploaded",
            "processing",
            "in_review",
            "approved",
            "rejected",
            "failed",
          ])
          .array()
          .optional(),
        orderBy: z
          .enum(["newest", "oldest", "most_views"])
          .optional()
          .default("newest"),
        duration: z
          .object({
            min: z.number().optional(), // Minimum duration in seconds
            max: z.number().optional(), // Maximum duration in seconds
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let isAdmin = false;
      if (ctx.session?.user) {
        const user = await ctx.db.query.user.findFirst({
          where: (users, { eq }) => eq(users.id, ctx.session?.user.id ?? ""),
        });

        isAdmin = user?.isAdmin ?? false;
      }

      let where: SQL<unknown> | undefined;

      // Filter out deleted videos
      where = and(where, isNull(schema.video.deletedAt));

      if (input.uploadedById) {
        where = and(where, eq(schema.video.uploadedById, input.uploadedById));
      }

      if (input.status) {
        where = and(where, inArray(schema.video.status, input.status));
      } else if (!isAdmin) {
        where = and(where, eq(schema.video.status, "approved"));
      }

      // Filter by duration if specified
      if (input.duration) {
        if (input.duration.min !== undefined) {
          where = and(
            where,
            gte(schema.video.durationSeconds, input.duration.min),
          );
        }
        if (input.duration.max !== undefined) {
          where = and(
            where,
            lte(schema.video.durationSeconds, input.duration.max),
          );
        }
      }

      let videos: Array<
        typeof schema.video.$inferSelect & {
          transcodeQueue: Array<typeof schema.transcodeQueue.$inferSelect>;
          viewCount?: number;
        }
      >;

      // Handle "most_views" ordering differently since it requires joining with view counts
      if (input.orderBy === "most_views") {
        // Get videos with view counts using a left join and subquery
        const videosWithViews = await ctx.db
          .select({
            video: schema.video,
            viewCount: count(schema.videoView.id),
          })
          .from(schema.video)
          .leftJoin(
            schema.videoView,
            eq(schema.video.id, schema.videoView.videoId),
          )
          .where(where)
          .groupBy(schema.video.id)
          .orderBy(desc(count(schema.videoView.id)))
          .limit(input.limit ?? 24)
          .offset(input.cursor ?? 0);

        // Fetch transcode queue separately for these videos
        const videoIds = videosWithViews.map((v) => v.video.id);
        const transcodeQueues = videoIds.length
          ? await ctx.db.query.transcodeQueue.findMany({
              where: (queue, { inArray }) => inArray(queue.videoId, videoIds),
              orderBy: [asc(schema.transcodeQueue.createdAt)],
            })
          : [];

        // Map videos with their transcode queue
        videos = videosWithViews.map((v) => ({
          ...v.video,
          transcodeQueue: transcodeQueues.filter(
            (tq) => tq.videoId === v.video.id,
          ),
          viewCount: v.viewCount,
        }));
      } else {
        // Standard ordering by date
        videos = await ctx.db.query.video.findMany({
          orderBy: [
            input.orderBy === "oldest"
              ? asc(schema.video.createdAt)
              : desc(schema.video.createdAt),
          ],
          where,
          with: {
            transcodeQueue: {
              orderBy: [asc(schema.transcodeQueue.createdAt)],
            },
          },
          limit: input.limit ?? 24,
          offset: input.cursor ?? 0,
        });
      }

      // Get view counts for all videos (if not already fetched)
      const views =
        input.orderBy === "most_views"
          ? videos.map((v) => ({
              videoId: v.id,
              count: (v as { viewCount?: number }).viewCount ?? 0,
            }))
          : await ctx.db
              .select({ videoId: schema.videoView.videoId, count: count() })
              .from(schema.videoView)
              .groupBy(schema.videoView.videoId);

      return videos.map((v) => {
        const viewsCount =
          (v as { viewCount?: number }).viewCount ??
          views.find((v2) => v2.videoId === v.id)?.count ??
          0;
        const transcode = v.transcodeQueue[0];
        const urls = buildVideoUrls(v, transcode);

        return {
          ...v,
          views: viewsCount,
          thumbnailUrl: urls.thumbnailUrl,
          transcode: {
            ...transcode,
            thumbnailsVtt: urls.thumbnailsVtt,
            hoverPreviewWebm: urls.hoverPreviewWebm,
            hoverPreviewMp4: urls.hoverPreviewMp4,
            hlsSource: urls.hlsSource,
            thumbnail25pct: urls.thumbnail25pct,
          },
        };
      });
    }),
});
