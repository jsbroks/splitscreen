import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowButton } from "~/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { getAvatarUrl } from "~/lib/avatar-utils";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";
import { api } from "~/trpc/server";
import { ProfileVideos } from "./_components/ProfileVideos";

const SITE_NAME = "Split Haven";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  const user = await db.query.user.findFirst({
    where: eq(schema.user.username, username),
  });

  if (!user) {
    return {
      title: "Profile not found",
      robots: { index: false, follow: false },
    };
  }

  const displayName =
    user.displayUsername ?? user.name ?? user.username ?? "User";
  const title = `${displayName} (@${user.username})`;
  const description = `View ${displayName}'s profile and uploaded videos on ${SITE_NAME}.`;

  return {
    title,
    description,
    keywords: [
      displayName,
      user.username ?? "user",
      "profile",
      "user",
      "videos",
    ].filter(Boolean),
    openGraph: {
      type: "profile",
      locale: "en_US",
      url: `${SITE_URL}/profile/${user.username}`,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: user.image
        ? [
            {
              url: user.image,
              width: 400,
              height: 400,
              alt: displayName ?? "",
            },
          ]
        : [
            {
              url: `${SITE_URL}/og-image.png`,
              width: 1200,
              height: 630,
              alt: `${SITE_NAME} - ${displayName}`,
            },
          ],
    },
    twitter: {
      card: "summary",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: user.image ? [user.image] : [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/profile/${user.username}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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
              <AvatarImage alt={displayName ?? ""} src={getAvatarUrl(user)} />
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

        <ProfileVideos userId={user.id} />
      </div>
    </main>
  );
}
