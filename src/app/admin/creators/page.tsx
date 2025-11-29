import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

export const metadata: Metadata = {
  title: "Manage Creators | Admin",
  description: "View and manage all creators on the platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CreatorsAdminPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  const user = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (!user?.isAdmin) {
    redirect("/");
  }

  const creators = await db.query.creator.findMany({
    with: {
      links: true,
    },
    orderBy: (creators, { asc }) => [asc(creators.displayName)],
  });

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Manage Creators</h1>
            <p className="text-muted-foreground">
              View and manage all creators on the platform
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/creators/new">Create New Creator</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <Card key={creator.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {creator.image && (
                    <Image
                      alt={creator.displayName}
                      className="size-12 rounded-full object-cover"
                      height={200}
                      src={creator.image}
                      width={200}
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle>{creator.displayName}</CardTitle>
                    <CardDescription>@{creator.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {creator.aliases.length > 0 && (
                  <div className="mb-2">
                    <p className="font-medium text-sm">Aliases:</p>
                    <p className="text-muted-foreground text-sm">
                      {creator.aliases.join(", ")}
                    </p>
                  </div>
                )}
                {creator.links.length > 0 && (
                  <div className="mb-2">
                    <p className="font-medium text-sm">Links:</p>
                    <ul className="space-y-1">
                      {creator.links.map((link) => (
                        <li key={link.id}>
                          <a
                            className="text-primary text-sm underline-offset-4 hover:underline"
                            href={link.link}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {new URL(link.link).hostname}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/creators/${creator.username}`}>
                      View Profile
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="default">
                    <Link href={`/admin/creators/${creator.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {creators.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No creators found. Create your first creator to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
