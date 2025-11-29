"use client";

import { Clock, SortAsc } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";
import { VideoCard } from "../_components/VideoCard";

type SortOption =
  | "newest"
  | "most-views"
  | "top-rated"
  | "longest"
  | "relevance";

const getSortBy = (option: SortOption) => {
  switch (option) {
    case "relevance":
      return {
        field: "popularity_score" as const,
        direction: "desc" as const,
      };
    case "newest":
      return { field: "created_at" as const, direction: "desc" as const };
    case "most-views":
      return { field: "view_count" as const, direction: "desc" as const };
    case "top-rated":
      return {
        field: "popularity_score" as const,
        direction: "desc" as const,
      };
    case "longest":
      return {
        field: "duration_seconds" as const,
        direction: "desc" as const,
      };
    default:
      return { field: "created_at" as const, direction: "desc" as const };
  }
};

const LIMIT = 24;

export function SearchContent() {
  const [searchQuery] = useQueryState("q");

  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [minDuration, setMinDuration] = useState<number | undefined>(undefined);
  const [maxDuration, setMaxDuration] = useState<number | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = api.videos.search.useInfiniteQuery(
    {
      search: searchQuery || "*",
      limit: LIMIT,
      sortBy: getSortBy(sortOption),
      duration: { min: minDuration, max: maxDuration },
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage || lastPage.length < LIMIT) {
          return undefined;
        }
        return allPages.length * LIMIT;
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

  const allVideos = data?.pages.flat() ?? [];

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        {/* Search Header */}
        <div className="space-y-2">
          <h1 className="font-bold text-xl tracking-tight">
            Showing results for{" "}
            <span className="text-primary">{searchQuery}</span>
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            onValueChange={(value) => setSortOption(value as SortOption)}
            value={sortOption}
          >
            <SelectTrigger>
              <SortAsc className="h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="most-views">Most Views</SelectItem>
              <SelectItem value="top-rated">Top Rated</SelectItem>
              <SelectItem value="longest">Longest</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              setMinDuration(value === "any" ? undefined : Number(value))
            }
            value={minDuration?.toString() ?? "any"}
          >
            <SelectTrigger>
              <Clock className="h-4 w-4" />
              <SelectValue placeholder="Min duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Min: Any</SelectItem>
              <SelectItem value="300">Min: 5 min</SelectItem>
              <SelectItem value="600">Min: 10 min</SelectItem>
              <SelectItem value="900">Min: 15 min</SelectItem>
              <SelectItem value="1800">Min: 30 min</SelectItem>
              <SelectItem value="3600">Min: 1 hour</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              setMaxDuration(value === "any" ? undefined : Number(value))
            }
            value={maxDuration?.toString() ?? "any"}
          >
            <SelectTrigger>
              <Clock className="h-4 w-4" />
              <SelectValue placeholder="Max duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Max: Any</SelectItem>
              <SelectItem value="300">Max: 5 min</SelectItem>
              <SelectItem value="600">Max: 10 min</SelectItem>
              <SelectItem value="900">Max: 15 min</SelectItem>
              <SelectItem value="1800">Max: 30 min</SelectItem>
              <SelectItem value="3600">Max: 1 hour</SelectItem>
              <SelectItem value="7200">Max: 2 hours</SelectItem>
            </SelectContent>
          </Select>

          {allVideos.length > 0 && (
            <span className="text-muted-foreground text-sm">
              {allVideos.length} result{allVideos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : isError ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-destructive">Error loading search results</p>
          </div>
        ) : allVideos.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
            <p className="text-lg text-muted-foreground">No videos found</p>
            {searchQuery && (
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filters
              </p>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
