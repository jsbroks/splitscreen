import { ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import { VideoCard } from "~/app/_components/VideoCard";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { VimoExample } from "./_components/video";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
        <div className="flex gap-6">
          <div className="grow space-y-6">
            <AspectRatio ratio={16 / 9}>
              <VimoExample />
            </AspectRatio>

            <div>
              <h2 className="mb-0 pb-0 font-bold text-xl">Some title</h2>
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <p className="grow text-muted-foreground">
                  100k views | 1 year ago
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
                <p className="font-bold">John Doe</p>
                <p className="text-muted-foreground text-xs">
                  3,245 Videos | 389K Subscribers
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
