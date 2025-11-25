import { formatDistanceToNow } from "date-fns";
import { ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import { notFound } from "next/navigation";
import { VideoCard } from "~/app/_components/VideoCard";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { count, db, eq, takeFirstOrNull } from "~/server/db";
import * as schema from "~/server/db/schema";
import { VimoExample } from "./_components/video";
import type { Metadata } from "next";

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
    .innerJoin(schema.user, eq(schema.video.userId, schema.user.id))
    .then(takeFirstOrNull);

  if (!result) {
    return {
      title: "Video not found | Splitscreen",
      robots: { index: false, follow: false },
    };
  }

  const { video, user } = result;
  const author = user.displayUsername ?? user.username;
  const title = `${video.title} by ${author} | Splitscreen`;
  const description = `Watch ${video.title} uploaded ${formatDistanceToNow(video.createdAt)} ago by ${author}.`;

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

  const result = await db
    .select()
    .from(schema.video)
    .where(eq(schema.video.id, id))
    .innerJoin(schema.user, eq(schema.video.userId, schema.user.id))
    .then(takeFirstOrNull);

  if (!result) notFound();

  const { video, user } = result;

  const { count: totalVideos } = (await db
    .select({ count: count() })
    .from(schema.video)
    .where(eq(schema.video.userId, user.id))
    .then(takeFirstOrNull)) ?? { count: 0 };

  const createdTimeAgo = formatDistanceToNow(video.createdAt);

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
        <div className="flex gap-6">
          <div className="grow space-y-6">
            <AspectRatio ratio={16 / 9}>
              <VimoExample />
            </AspectRatio>

            <div>
              <h2 className="mb-0 pb-0 font-bold text-xl">{video.title}</h2>
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <p className="grow text-muted-foreground">
                  100k views | {createdTimeAgo} ago
                </p>

                <div className="flex shrink-0 items-center gap-2">
                  <ThumbsUp className="size-4" /> <span>120</span> |{" "}
                  <ThumbsDown className="size-4" />
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
                <AvatarFallback className="size-9">JL</AvatarFallback>
              </Avatar>
              <div className="grow">
                <p className="font-bold">
                  {user.displayUsername ?? user.username}
                </p>
                <p className="text-muted-foreground text-xs">
                  {new Intl.NumberFormat("en", { notation: "compact" }).format(
                    totalVideos ?? 0,
                  )}{" "}
                  video{totalVideos > 1 ? "s" : ""} | 389K Subscribers
                </p>
              </div>
              <Button className="shrink-0" size="lg" variant="outline">
                <UserPlus className="size-4" />
                Follow
              </Button>
            </section>

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
                <VideoCard />
                <VideoCard />
                <VideoCard />
                <VideoCard /> <VideoCard /> <VideoCard /> <VideoCard />
              </div>
            </section>
          </div>

          <div className="w-[300px] shrink-0 space-y-3">
            <VideoCard />
            <VideoCard />
            <VideoCard /> <VideoCard /> <VideoCard />
          </div>
        </div>
      </div>
    </main>
  );
}
