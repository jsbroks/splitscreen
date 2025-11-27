import { formatDistanceToNow } from "date-fns";
import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoCard } from "~/app/_components/VideoCard";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { getSession } from "~/server/better-auth/server";
import { count, db, eq, takeFirstOrNull } from "~/server/db";
import * as schema from "~/server/db/schema";
import { api } from "~/trpc/server";
import { Reactions } from "./_components/Reactions";
import { FingerPrintViewCounter } from "./_components/ViewCounter";
import { VimoExample } from "./_components/video";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const result = await db
    .select()
    .from(schema.video)
    .where(eq(schema.video.id, id))
    .innerJoin(schema.user, eq(schema.video.uploadedById, schema.user.id))
    .leftJoin(schema.creator, eq(schema.video.creatorId, schema.creator.id))
    .then(takeFirstOrNull);

  if (!result) {
    return {
      title: "Video not found | Splitscreen",
      robots: { index: false, follow: false },
    };
  }

  const { video, user, creator } = result;
  const author =
    creator?.displayName ??
    creator?.username ??
    user.displayUsername ??
    user.username;
  const title = `${video.title} by ${author} | Splitscreen`;
  const description = `Watch ${video.title} created ${formatDistanceToNow(video.createdAt)} ago by ${author}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const video = await db.query.video.findFirst({
    where: eq(schema.video.id, id),
    with: {
      uploadedBy: true,
      tags: true,
      featuredCreators: {
        with: {
          creator: true,
        },
      },
    },
  });

  // Get the main creator separately if creatorId is set
  const mainCreator = video?.creatorId
    ? await db.query.creator.findFirst({
        where: eq(schema.creator.id, video.creatorId),
      })
    : null;

  if (!video) notFound();

  const session = await getSession();
  if (session != null) {
    await api.videos.view({ videoId: video.id });
  }

  const { count: totalVideos } = (await db
    .select({ count: count() })
    .from(schema.video)
    .where(eq(schema.video.uploadedById, video.uploadedById))
    .then(takeFirstOrNull)) ?? { count: 0 };

  const createdTimeAgo = formatDistanceToNow(video.createdAt);

  const { count: viewsCount } = (await db
    .select({ count: count() })
    .from(schema.videoView)
    .where(eq(schema.videoView.videoId, video.id))
    .then(takeFirstOrNull)) ?? { count: 0 };

  const formattedViewsCount = new Intl.NumberFormat("en", {
    notation: "compact",
  }).format(viewsCount ?? 0);

  return (
    <main>
      {session == null && <FingerPrintViewCounter videoId={video.id} />}
      <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
        <div className="flex gap-6">
          <div className="grow space-y-6">
            <AspectRatio ratio={16 / 9}>
              <VimoExample />
            </AspectRatio>

            <div>
              <h2 className="mb-0 pb-0 font-bold text-xl">{video.title}</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <p className="grow text-muted-foreground">
                  {formattedViewsCount} view{viewsCount === 1 ? "" : "s"} |{" "}
                  {createdTimeAgo} ago
                </p>

                <div className="mr-4">
                  <Reactions videoId={video.id} />
                </div>

                <Button size="sm" variant="outline">
                  Share
                </Button>
                <Button size="sm" variant="outline">
                  Report
                </Button>
              </div>
            </div>

            <section className="flex items-center gap-2">
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={video.uploadedBy.image ?? undefined} />
                <AvatarFallback className="size-9">
                  {(
                    video.uploadedBy.displayUsername ??
                    video.uploadedBy.username
                  )
                    ?.slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link
                className="block hover:text-primary"
                href={`/profile/${video.uploadedBy.username}`}
              >
                <p className="font-bold">
                  {video.uploadedBy.displayUsername ??
                    video.uploadedBy.username}
                </p>
                <p className="text-muted-foreground text-xs">
                  {new Intl.NumberFormat("en", { notation: "compact" }).format(
                    totalVideos ?? 0,
                  )}{" "}
                  video{totalVideos > 1 ? "s" : ""} | 389K Subscribers
                </p>
              </Link>
              <div className="grow" />
              <Button className="shrink-0" size="lg" variant="outline">
                <UserPlus className="size-4" />
                Follow
              </Button>
            </section>

            {mainCreator && (
              <section className="space-y-2">
                <p className="text-muted-foreground text-sm">Video Creator</p>
                <Link
                  className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 hover:bg-secondary/80"
                  href={`/creator/${mainCreator.username}`}
                >
                  {mainCreator.image && (
                    <Avatar className="size-6">
                      <AvatarImage src={mainCreator.image} />
                      <AvatarFallback>
                        {mainCreator.displayName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="font-medium">{mainCreator.displayName}</span>
                </Link>
              </section>
            )}

            {video.featuredCreators && video.featuredCreators.length > 0 && (
              <section className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Featured Creators
                </p>
                <div className="flex flex-wrap gap-2">
                  {video.featuredCreators.map(({ creator }) => (
                    <Link
                      className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 hover:bg-secondary/80"
                      href={`/creator/${creator.username}`}
                      key={creator.id}
                    >
                      {creator.image && (
                        <Avatar className="size-6">
                          <AvatarImage src={creator.image} />
                          <AvatarFallback>
                            {creator.displayName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="font-medium">{creator.displayName}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <p className="text-muted-foreground">Categories</p>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary">PMV</Button>
                <Button variant="secondary">Vlog</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
                <Button variant="secondary">Cute vs Slut</Button>
              </div>
            </section>

            <button
              className="flex w-full cursor-pointer items-center gap-5 text-muted-foreground"
              type="button"
            >
              <span className="grow border-muted-foreground/50 border-b" />{" "}
              <span className="shrink-0 text-sm uppercase">View more</span>{" "}
              <span className="grow border-muted-foreground/50 border-b" />
            </button>

            <section className="space-y-2">
              <p className="text-muted-foreground">Related videos</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-3">
                <VideoCard id="1" title="Video 1" views={1000} />
                <VideoCard id="2" title="Video 2" views={1000} />
                <VideoCard id="3" title="Video 3" views={1000} />
                <VideoCard id="4" title="Video 4" views={1000} />
                <VideoCard id="5" title="Video 5" views={1000} />
                <VideoCard id="6" title="Video 6" views={1000} />
                <VideoCard id="7" title="Video 7" views={1000} />
                <VideoCard id="8" title="Video 8" views={1000} />
                <VideoCard id="9" title="Video 9" views={1000} />
                <VideoCard id="10" title="Video 10" views={1000} />
              </div>
            </section>
          </div>

          <div className="w-[300px] shrink-0 space-y-3">
            <VideoCard id="1" title="Video 1" views={1000} />
            <VideoCard id="2" title="Video 2" views={1000} />
            <VideoCard id="3" title="Video 3" views={1000} />
            <VideoCard id="4" title="Video 4" views={1000} />
            <VideoCard id="5" title="Video 5" views={1000} />
            <VideoCard id="6" title="Video 6" views={1000} />
            <VideoCard id="7" title="Video 7" views={1000} />
            <VideoCard id="8" title="Video 8" views={1000} />
            <VideoCard id="9" title="Video 9" views={1000} />
            <VideoCard id="10" title="Video 10" views={1000} />
          </div>
        </div>
      </div>
    </main>
  );
}
