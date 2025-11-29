"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";
import { VideoCard } from "./VideoCard";

interface InfiniteVideoGridProps {
  sortBy?: {
    field:
      | "created_at"
      | "view_count"
      | "popularity_score"
      | "duration_seconds";
    direction: "asc" | "desc";
  };
  timePeriod?: "all-time" | "this-week" | "this-month" | "this-year";
  tagIds?: string[];
}

const LIMIT = 24;

export function InfiniteVideoGrid({ sortBy, tagIds }: InfiniteVideoGridProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = api.videos.search.useInfiniteQuery(
    {
      limit: LIMIT,
      sortBy: sortBy ?? { field: "created_at", direction: "desc" },
      tagIds,
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        // If the last page has fewer items than the limit, we've reached the end
        if (!lastPage || lastPage.length < LIMIT) {
          return undefined;
        }
        const nextCursor = allPages.length * LIMIT;
        return nextCursor;
      },
      initialCursor: 0,
      refetchOnWindowFocus: false,
    },
  );

  const observerTarget = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          console.log("Loading more videos...", { hasNextPage });
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Error loading videos</p>
      </div>
    );
  }

  // biome-ignore lint/complexity/noFlatMapIdentity: idk why biome is complaining about this
  const allVideos = data?.pages.flatMap((page) => page) ?? [];

  if (allVideos.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">No videos found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {allVideos.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>

      {/* Intersection observer target */}
      <div className="flex justify-center py-4" ref={observerTarget}>
        {isFetchingNextPage && <Spinner className="h-6 w-6" />}
      </div>

      {!hasNextPage && allVideos.length > 0 && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          You've reached the end
        </div>
      )}
    </div>
  );
}
