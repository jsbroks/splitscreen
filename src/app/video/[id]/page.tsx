import { formatDistanceToNow } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoCard } from "~/app/_components/VideoCard";
import { FollowButton } from "~/components/FollowButton";
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
import { ReportDialog } from "./_components/ReportDialog";
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
    .then(takeFirstOrNull);

  if (!result) {
    return {
      title: "Video not found | Split Haven",
      robots: { index: false, follow: false },
    };
  }

  const { video, user } = result;
  const author = user.displayUsername ?? user.username;
  const title = `${video.title} by ${author} | Split Haven`;
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

  const followStats = await api.users.getFollowStats({
    userId: video.uploadedById,
  });

  const posterUrl = video.thumbnailUrl ?? undefined;

  const src =
    video.transcode?.status === "done" && video.transcode?.hlsSource
      ? video.transcode.hlsSource
      : video.videoUrl;

  const relatedVideos = await api.videos.related({ videoId, limit: 3 + 4 * 4 });
  const first3RelatedVideos = relatedVideos.slice(0, 3);
  const remainingRelatedVideos = relatedVideos.slice(3, Infinity);

  return (
    <main>
      {session == null && <FingerPrintViewCounter videoId={video.id} />}
      <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
        {video.transcode?.status !== "done" && (
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
              The video will not be visible to other users until it is approved.
            </AlertDescription>
          </Alert>
        )}

        {video.status === "rejected" && (
          <Alert variant="destructive">
            <AlertTitle>This video has been rejected.</AlertTitle>
            <AlertDescription>
              {video.rejectionMessage
                ? video.rejectionMessage
                : "This video does not meet our content guidelines."}
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
                    video{totalVideos > 1 ? "s" : ""} |{" "}
                    {new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(followStats.followers)}{" "}
                    follower{followStats.followers !== 1 ? "s" : ""}
                  </p>
                </Link>
              </div>

              {!isUploader && (
                <FollowButton
                  className="shrink-0 rounded-full"
                  userId={video.uploadedById}
                />
              )}

              <div className="grow" />

              <div>
                <Reactions videoId={video.id} />
              </div>

              <div className="flex items-center gap-2">
                <Button className="rounded-full" size="sm" variant="outline">
                  Share
                </Button>
                <ReportDialog videoId={video.id} />
                {isUploaderOrAdmin && <VideoActionsMenu videoId={video.id} />}
              </div>
            </section>
            <VideoInfoCard
              createdAt={video.createdAt}
              creators={video.creators}
              tags={video.tags}
              views={video.views}
            />
          </div>

          <div className="hidden w-[300px] shrink-0 lg:block">
            <div className="grid grid-cols-1 gap-3">
              {first3RelatedVideos.map((v) => (
                <VideoCard key={v.id} {...v} />
              ))}
            </div>
          </div>
        </div>

        <section className="space-y-2 py-4">
          <p className="text-muted-foreground">Related videos</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
            {remainingRelatedVideos.map((v) => (
              <VideoCard key={v.id} {...v} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
