"use client";

import { Calendar, SortAsc } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CategoriesCarousel } from "./CategoriesCarousel";
import { InfiniteVideoGrid } from "./InfiniteVideoGrid";

enum TimePeriod {
  ALL_TIME = "all-time",
  THIS_WEEK = "this-week",
  THIS_MONTH = "this-month",
  THIS_YEAR = "this-year",
}

enum SortOption {
  NEWEST = "newest",
  MOST_VIEWS = "most-views",
  TOP_RATED = "top-rated",
  LONGEST = "longest",
}

type VideoDiscoveryProps = {
  tags: { id: string; name: string; slug: string }[];
};

// Map UI sort options to API sort parameters
const getSortBy = (option: SortOption) => {
  switch (option) {
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

export function VideoDiscovery({ tags }: VideoDiscoveryProps) {
  const [timePeriod, setTimePeriod] = useQueryState(
    "period",
    parseAsStringEnum(Object.values(TimePeriod)).withDefault(
      TimePeriod.ALL_TIME,
    ),
  );

  const [sortOption, setSortOption] = useQueryState(
    "sort",
    parseAsStringEnum(Object.values(SortOption)).withDefault(SortOption.NEWEST),
  );
  const [tagIds, setTagIds] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
      <div className="flex items-center gap-2">
        <Select
          onValueChange={(value) => setTimePeriod(value as TimePeriod)}
          value={timePeriod}
        >
          <SelectTrigger>
            <Calendar />
            <SelectValue placeholder="Select a time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-time">All Time</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => setSortOption(value as SortOption)}
          value={sortOption}
        >
          <SelectTrigger>
            <SortAsc />
            <SelectValue placeholder="Select a sorting option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="most-views">Most Views</SelectItem>
            <SelectItem value="top-rated">Top Rated</SelectItem>
            <SelectItem value="longest">Longest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CategoriesCarousel
        onTagSelect={(tagId) => {
          const tags = tagIds.includes(tagId)
            ? tagIds.filter((id) => id !== tagId)
            : [...tagIds, tagId];
          setTagIds(tags);
        }}
        selectedTagIds={tagIds}
        tags={tags}
      />

      <InfiniteVideoGrid
        sortBy={getSortBy(sortOption)}
        tagIds={tagIds}
        // timePeriod={timePeriod} // TODO: Implement time-based filtering in backend
      />
    </div>
  );
}
