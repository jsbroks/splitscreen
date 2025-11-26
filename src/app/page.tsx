import { Calendar, Filter, SortAsc } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db, desc } from "~/server/db";
import * as schema from "~/server/db/schema";
import { HydrateClient } from "~/trpc/server";
import { CategoriesCarousel } from "./_components/CategoriesCarousel";
import { VideoCard } from "./_components/VideoCard";

export default async function Home() {
  const videos = await db
    .select()
    .from(schema.video)
    .orderBy(desc(schema.video.createdAt))
    .limit(24);

  return (
    <HydrateClient>
      <main>
        <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline">
              <Filter />
            </Button>

            <Select value="all-time">
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

            <Select value="newest">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
