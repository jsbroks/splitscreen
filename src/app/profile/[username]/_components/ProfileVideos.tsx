"use client";

import { useState } from "react";
import { VideoCard } from "~/app/_components/VideoCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type SortOption = "recent" | "views" | "duration";

interface ProfileVideosProps {
  userId: string;
}

export const ProfileVideos: React.FC<ProfileVideosProps> = ({ userId }) => {
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const { data: videos } = api.videos.search.useQuery({
    uploadedById: userId,
    limit: 24,
    sortBy:
      sortBy === "recent"
        ? { field: "created_at", direction: "desc" }
        : sortBy === "views"
          ? { field: "view_count", direction: "desc" }
          : { field: "duration_seconds", direction: "desc" },
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl">Videos</h2>
        <Select
          onValueChange={(value) => setSortBy(value as SortOption)}
          value={sortBy}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="views">Most Viewed</SelectItem>
            <SelectItem value="duration">Longest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!videos || videos.length === 0 ? (
        <p className="text-muted-foreground">No videos yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} {...v} />
          ))}
        </div>
      )}
    </section>
  );
};
