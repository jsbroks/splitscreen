import { z } from "zod";
import { and, asc, count, eq, isNull, takeFirst } from "~/server/db";
import * as schema from "~/server/db/schema";
import { typesense } from "~/server/typesense/client";
import type { VideoV1 } from "~/server/typesense/schemas/videos";
import {
  type EnrichedVideo,
  VideoQueryBuilder,
} from "~/server/typesense/utils";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { buildVideoUrls } from "../../utils/video-urls";

// Helper function to shuffle array (Fisher-Yates shuffle)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    if (temp !== undefined && shuffled[j] !== undefined) {
      shuffled[i] = shuffled[j] as T;
      shuffled[j] = temp;
    }
  }
  return shuffled;
};

/**
 * Router for querying video data
 */
export const videoQueriesRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        search: z.string().optional().default("*"),

        tagIds: z.array(z.string()).optional(),
        creatorId: z.string().optional(),
        uploadedById: z.string().optional(),

        sortBy: z
          .object({
            field: z.enum([
              "created_at",
              "updated_at",
              "popularity_score",
              "trending_score",
              "engagement_rate",
              "view_count",
              "like_count",
              "dislike_count",
              "duration_seconds",
              "views_last_24h",
              "views_last_7d",
              "likes_last_24h",
              "likes_last_7d",
            ]),
            direction: z.enum(["asc", "desc"]),
          })
          .optional()
          .default({ field: "created_at", direction: "desc" }),

        duration: z
          .object({
            min: z.number().min(0).optional(),
            max: z.number().min(0).optional(),
          })
          .optional(),

        status: z
          .enum(["approved", "rejected", "in_review"])
          .default("approved")
          .optional(),

        cursor: z.number().min(0).nullish(),
        limit: z.number().min(1).max(100).default(24),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { duration } = input;
      const user = await ctx.db.query.user.findFirst({
        where: eq(schema.user.id, ctx.session?.user?.id ?? ""),
      });

      const isAdmin = user?.isAdmin ?? false;
      const isUploader = user?.id === input.uploadedById;

      let status: string | undefined;
      if (isUploader || isAdmin) {
        status = input.status;
      }

      const query = new VideoQueryBuilder()
        .search(input.search ?? "*")
        .limit(input.limit)
        .offset(input.cursor ?? null)
        .sortBy(input.sortBy.field, input.sortBy.direction)
        .whereTags(input.tagIds ?? [])
        .whereCreatorId(input.creatorId)
        .whereUploadedById(input.uploadedById)
        .whereDurationBetween(duration?.min, duration?.max)
        .whereStatus(status)
        .searchFields([
          ["title", 2],
          ["description", 1],
          ["featured_creator_display_names", 1],
          ["featured_creator_aliases", 1],
          ["tag_names", 1],
          ["creator_username", 1],
          ["creator_display_name", 2],
        ])
        .executeAndMap();

      return query;
    }),

  related: publicProcedure
    .input(
      z.object({
        videoId: z.string().min(1),
        limit: z.number().min(1).max(100).default(12),
      }),
    )
    .query(async ({ input }) => {
      // Fetch the source video to get its tags and featured creators
      const sourceVideo = await typesense
        .collections<VideoV1>("video_v1")
        .documents(input.videoId)
        .retrieve();

      const collectedVideos = new Map<string, EnrichedVideo>();
      const tagIds = sourceVideo.tag_ids ?? [];
      const featuredCreatorIds = sourceVideo.featured_creator_ids ?? [];

      const hasTags = tagIds.length > 0;
      const hasFeaturedCreators = featuredCreatorIds.length > 0;

      console.log(
        (
          await new VideoQueryBuilder()
            .search("*")
            .whereApproved()
            .executeAndMap()
        ).length,
      );

      // Strategy 1: Videos with matching tags AND featured creators (most related)
      if (hasTags && hasFeaturedCreators) {
        const builder = new VideoQueryBuilder()
          .search("*")
          .whereApproved()
          .whereTags(tagIds)
          .sortByPopularity()
          .addSort("created_at", "desc")
          .limit(input.limit * 3); // Fetch more for randomization

        const creatorFilters = featuredCreatorIds
          .map((id: string) => `featured_creator_ids:=${id}`)
          .join(" || ");
        builder.addFilter(`(${creatorFilters})`);

        const results = await builder.executeAndMap({
          filterVideoIds: (id) => id !== input.videoId,
        });

        // Shuffle results to add randomness
        const shuffledResults = shuffleArray(results);

        for (const video of shuffledResults) {
          if (collectedVideos.size >= input.limit) break;
          collectedVideos.set(video.id, video);
        }
      }

      // Strategy 2: Videos with matching tags (if we still need more)
      if (collectedVideos.size < input.limit && hasTags) {
        const results = await new VideoQueryBuilder()
          .search("*")
          .whereApproved()
          .whereTags(tagIds)
          .sortByPopularity()
          .addSort("created_at", "desc")
          .limit(input.limit * 3) // Fetch more for randomization
          .executeAndMap({
            filterVideoIds: (id) => id !== input.videoId,
          });

        // Shuffle results to add randomness
        const shuffledResults = shuffleArray(results);

        for (const video of shuffledResults) {
          if (collectedVideos.size >= input.limit) break;
          if (!collectedVideos.has(video.id)) {
            collectedVideos.set(video.id, video);
          }
        }
      }

      // Strategy 3: Videos with matching featured creators (if we still need more)
      if (collectedVideos.size < input.limit && hasFeaturedCreators) {
        const builder = new VideoQueryBuilder()
          .search("*")
          .whereApproved()
          .sortByPopularity()
          .addSort("created_at", "desc")
          .limit(input.limit * 3); // Fetch more for randomization

        const creatorFilters = featuredCreatorIds
          .map((id: string) => `featured_creator_ids:=${id}`)
          .join(" || ");
        builder.addFilter(`(${creatorFilters})`);

        const results = await builder.executeAndMap({
          filterVideoIds: (id) => id !== input.videoId,
        });

        // Shuffle results to add randomness
        const shuffledResults = shuffleArray(results);

        for (const video of shuffledResults) {
          if (collectedVideos.size >= input.limit) break;
          if (!collectedVideos.has(video.id)) {
            collectedVideos.set(video.id, video);
          }
        }
      }

      // Strategy 4: Videos by same creator (if we still need more)
      if (collectedVideos.size < input.limit && sourceVideo.creator_id) {
        const results = await new VideoQueryBuilder()
          .search("*")
          .whereApproved()
          .whereCreatorOrFeatured(sourceVideo.creator_id)
          .sortByPopularity()
          .addSort("created_at", "desc")
          .limit(input.limit * 3) // Fetch more for randomization
          .executeAndMap({
            filterVideoIds: (id) => id !== input.videoId,
          });

        // Shuffle results to add randomness
        const shuffledResults = shuffleArray(results);

        for (const video of shuffledResults) {
          if (collectedVideos.size >= input.limit) break;
          if (!collectedVideos.has(video.id)) {
            collectedVideos.set(video.id, video);
          }
        }
      }

      // Strategy 5: Fill with popular videos (least related, but ensures we have enough)
      if (collectedVideos.size < input.limit) {
        const results = await new VideoQueryBuilder()
          .search("*")
          .whereApproved()
          .sortByPopularity()
          .addSort("created_at", "desc")
          .limit(input.limit * 3) // Fetch more for randomization
          .executeAndMap({
            filterVideoIds: (id) => id !== input.videoId,
          });

        // Shuffle results to add randomness
        const shuffledResults = shuffleArray(results);

        for (const video of shuffledResults) {
          if (collectedVideos.size >= input.limit) break;
          if (!collectedVideos.has(video.id)) {
            collectedVideos.set(video.id, video);
          }
        }
      }

      // Return videos in collection order (most related first)
      return Array.from(collectedVideos.values()).slice(0, input.limit);
    }),

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
          creators: {
            with: {
              creator: true,
            },
          },
        },
      });

      if (!video) {
        return null;
      }

      // Total views = denormalized count (archived/compressed views) + current views in table
      const baseViewCount = video.viewCount ?? 0;
      const views = await ctx.db
        .select({ count: count() })
        .from(schema.videoView)
        .where(eq(schema.videoView.videoId, input.videoId))
        .then(takeFirst);
      const currentViewCount = views?.count ?? 0;
      const totalViews = baseViewCount + currentViewCount;

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
        views: totalViews,
      };
    }),
});
