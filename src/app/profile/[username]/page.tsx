import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card } from "~/components/ui/card";
import { db } from "~/server/db";
import { user as userTable } from "~/server/db/schema/auth";
import { video as videoTable } from "~/server/db/schema/videos";

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;

  const u = await db.query.user.findFirst({
    where: eq(userTable.username, username),
    columns: {
      id: true,
      username: true,
      displayUsername: true,
      image: true,
      name: true,
    },
  });
  if (!u) {
    notFound();
  }

  const videos = await db.query.video.findMany({
    where: eq(videoTable.userId, u.id),
    columns: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
    },
    orderBy: desc(videoTable.createdAt),
    limit: 24,
  });

  const display = u.displayUsername || u.name || u.username;

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage alt={display ?? ""} src={u.image ?? undefined} />
            <AvatarFallback>
              {(display ?? u.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold text-2xl">{display}</h1>
            <p className="text-muted-foreground">@{u.username}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">Videos</h2>
          {videos.length === 0 ? (
            <p className="text-muted-foreground">No videos yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <Link href={`/video/${v.id}`} key={v.id}>
                  <Card className="overflow-hidden">
                    <div className="aspect-video w-full bg-secondary/40" />
                    <div className="space-y-1 p-3">
                      <div className="line-clamp-1 font-medium text-sm">
                        {v.title}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {v.status}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
