import { formatDistanceToNow } from "date-fns";
import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoCard } from "~/app/_components/VideoCard";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { getSession } from "~/server/better-auth/server";
import { count, db, eq, takeFirst, takeFirstOrNull } from "~/server/db";
import * as schema from "~/server/db/schema";
import { api } from "~/trpc/server";
import { Player } from "./_components/HlsPlayer";
import { Reactions } from "./_components/Reactions";
import { VideoActionsMenu } from "./_components/VideoActionsMenu";
import { VideoInfoCard } from "./_components/VideoInfoCard";
import { FingerPrintViewCounter } from "./_components/ViewCounter";

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
  const { id: videoId } = await params;

  const video = await api.videos.getVideo({ videoId });

  // Get the main creator separately if creatorId is set
  const mainCreator = video?.creatorId
    ? await db.query.creator.findFirst({
        where: eq(schema.creator.id, video.creatorId),
      })
    : null;

  if (!video) notFound();

  const session = await getSession();
  if (session != null) {
    await api.videos.view({ videoId });
  }

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session?.user?.id ?? ""),
  });
  const isUploader = session?.user?.id === video.uploadedById;
  const isAdmin = user?.isAdmin ?? false;
  const isUploaderOrAdmin = isUploader || isAdmin;

  const totalVideos =
    (
      await db
        .select({ count: count() })
        .from(schema.video)
        .where(eq(schema.video.uploadedById, video.uploadedById))
        .then(takeFirst)
    )?.count ?? 0;

  const posterUrl = video.thumbnailUrl ?? undefined;

  const src =
    video.transcode?.status === "done" && video.transcode?.hlsSource
      ? video.transcode.hlsSource
      : video.videoUrl;

  return (
    <main>
      {session == null && <FingerPrintViewCounter videoId={video.id} />}
      <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
        {(video.status === "processing" ||
          video.transcode?.status !== "done") && (
          <Alert variant="destructive">
            <AlertTitle>
              This video is processing. Loading may be slow until it is ready.
            </AlertTitle>
            <AlertDescription></AlertDescription>
          </Alert>
        )}

        {video.status === "in_review" && (
          <Alert>
            <AlertTitle>This video is under review.</AlertTitle>
            <AlertDescription>
              Please wait for it to be approved by our team.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-6">
          <div className="grow space-y-6">
            <AspectRatio ratio={16 / 9}>
              {src && (
                <Player
                  posterUrl={posterUrl}
                  previewThumbnails={
                    video.transcode?.thumbnailsVtt ?? undefined
                  }
                  src={src}
                />
              )}
            </AspectRatio>
            <section className="flex items-center gap-4">
              <div className="flex items-center gap-2">
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
                    {new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(totalVideos ?? 0)}{" "}
                    video{totalVideos > 1 ? "s" : ""} | 389K Subscribers
                  </p>
                </Link>
              </div>

              <Button
                className="shrink-0 rounded-full"
                size="lg"
                variant="outline"
              >
                <UserPlus className="size-4" />
                Follow
              </Button>

              <div className="grow" />

              <div>
                <Reactions videoId={video.id} />
              </div>

              <div className="flex items-center gap-2">
                <Button className="rounded-full" size="sm" variant="outline">
                  Share
                </Button>
                <Button className="rounded-full" size="sm" variant="outline">
                  Report
                </Button>
                {isUploaderOrAdmin && <VideoActionsMenu videoId={video.id} />}
              </div>
            </section>
            <VideoInfoCard
              createdAt={video.createdAt}
              featuredCreators={video.featuredCreators}
              mainCreator={mainCreator ?? null}
              tags={video.tags}
              views={video.views}
            />
          </div>

          <div className="hidden w-[300px] shrink-0 lg:block">
            <div className="grid grid-cols-1 gap-3">
              <VideoCard id="1" title="Video 1" views={1000} />
              <VideoCard id="2" title="Video 2" views={1000} />
              <VideoCard id="3" title="Video 3" views={1000} />
            </div>
          </div>
        </div>

        <section className="space-y-2 py-4">
          <p className="text-muted-foreground">Related videos</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
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
    </main>
  );
}
