import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { VideoCard } from "~/app/_components/VideoCard";
import { FollowButton } from "~/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { getSession } from "~/server/better-auth/server";
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
  });

  if (!user) {
    notFound();
  }

  const videos = await api.videos.search({
    uploadedById: user.id,
    limit: 24,
    sortBy: { field: "created_at", direction: "desc" },
  });

  const displayName = user.displayUsername ?? user.name ?? user.username;

  const session = await getSession();
  const isOwnProfile = session?.user?.id === user.id;

  const followStats = await api.users.getFollowStats({
    userId: user.id,
  });

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center justify-between">
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
              <div className="mt-1 flex gap-4 text-sm">
                <div>
                  <span className="font-semibold">
                    {new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(videos.length)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    video{videos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">
                    {new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(followStats.followers)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    follower{followStats.followers !== 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">
                    {new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(followStats.following)}
                  </span>{" "}
                  <span className="text-muted-foreground">following</span>
                </div>
              </div>
            </div>
          </div>
          {!isOwnProfile && <FollowButton userId={user.id} />}
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">Videos</h2>
          {videos.length === 0 ? (
            <p className="text-muted-foreground">No videos yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {videos.map((v) => (
                <VideoCard key={v.id} {...v} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
