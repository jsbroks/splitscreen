"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";
import { VideoCard } from "./VideoCard";

interface InfiniteVideoGridProps {
  orderBy?: "newest" | "oldest" | "most_views";
}

const LIMIT = 24;

export function InfiniteVideoGrid({
  orderBy = "newest",
}: InfiniteVideoGridProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = api.videos.videos.useInfiniteQuery(
    {
      limit: LIMIT,
      orderBy,
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        // If the last page has fewer items than the limit, we've reached the end
        if (!lastPage || lastPage.length < LIMIT) {
          return undefined;
        }
        // Calculate the next cursor (offset) based on total pages fetched
        const nextCursor = allPages.length * LIMIT;
        console.log("Next page cursor:", nextCursor);
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
          <VideoCard
            key={video.id}
            previewVideoUrl={video.transcode?.hoverPreviewWebm}
            thumbnail25pctUrl={video.transcode?.thumbnail25pct}
            {...video}
          />
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
