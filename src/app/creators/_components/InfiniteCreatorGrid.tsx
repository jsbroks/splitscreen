"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";

const LIMIT = 20;

export function InfiniteCreatorGrid() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = api.creators.infiniteList.useInfiniteQuery(
    {
      limit: LIMIT,
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
          console.log("Loading more creators...", { hasNextPage });
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
        <p className="text-destructive">Error loading creators</p>
      </div>
    );
  }

  // biome-ignore lint/complexity/noFlatMapIdentity: flatten pages array
  const allCreators = data?.pages.flatMap((page) => page) ?? [];

  if (allCreators.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">No creators found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {allCreators.map((creator) => {
          // Calculate age from birthday
          const age = creator.birthday
            ? (() => {
                const today = new Date();
                const birthDate = new Date(creator.birthday);
                let calculatedAge =
                  today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (
                  monthDiff < 0 ||
                  (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ) {
                  calculatedAge--;
                }
                return calculatedAge;
              })()
            : null;

          return (
            <Link
              className="group"
              href={`/creators/${creator.username}`}
              key={creator.id}
            >
              <div className="relative h-64 overflow-hidden rounded-lg border transition-all hover:shadow-lg">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-center bg-cover transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundImage: creator.image
                      ? `url(${creator.image})`
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                </div>

                {/* Content Banner */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="space-y-1">
                    <h3 className="line-clamp-1 font-bold text-lg text-white">
                      {creator.displayName}
                    </h3>
                    {age && (
                      <div className="text-xs">
                        <span>{age} yo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Intersection observer target */}
      <div className="flex justify-center py-4" ref={observerTarget}>
        {isFetchingNextPage && <Spinner className="h-6 w-6" />}
      </div>

      {!hasNextPage && allCreators.length > 0 && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          You've reached the end
        </div>
      )}
    </div>
  );
}
