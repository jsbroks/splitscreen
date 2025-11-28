import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { VideoCard } from "~/app/_components/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import { db } from "~/server/db";
import * as schema from "~/server/db/schema";
import { api } from "~/trpc/server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await db.query.user.findFirst({
    where: eq(schema.user.username, username),
    with: {
      uploadedVideos: {
        orderBy: desc(schema.video.createdAt),
        limit: 24,
      },
    },
  });

  if (!user) {
    notFound();
  }

  const videos = await api.videos.videos({
    uploadedById: user.id,
    limit: 24,
  });
  const displayName = user.displayUsername ?? user.name ?? user.username;

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage
              alt={displayName ?? ""}
              src={user.image ?? undefined}
            />
            <AvatarFallback>
              {(user.displayUsername ?? user.name ?? user.username)
                ?.slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold text-2xl">{displayName}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">Videos</h2>
          {videos.length === 0 ? (
            <p className="text-muted-foreground">No videos yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {videos.map((v) => (
                <VideoCard
                  key={v.id}
                  previewVideoUrl={v.transcode?.hoverPreviewWebm}
                  thumbnail25pctUrl={v.transcode?.thumbnail25pct}
                  {...v}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
