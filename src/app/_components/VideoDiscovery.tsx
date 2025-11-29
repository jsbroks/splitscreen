"use client";

import { Calendar, SortAsc } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CategoriesCarousel } from "./CategoriesCarousel";
import { InfiniteVideoGrid } from "./InfiniteVideoGrid";

type TimePeriod = "all-time" | "this-week" | "this-month" | "this-year";
type SortOption = "newest" | "most-views" | "top-rated" | "longest";

export function VideoDiscovery() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all-time");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

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
      <CategoriesCarousel />

      <InfiniteVideoGrid
        sortBy={getSortBy(sortOption)}
        // timePeriod={timePeriod} // TODO: Implement time-based filtering in backend
      />
    </div>
  );
}
