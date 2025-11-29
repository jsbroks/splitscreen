import {
  SiFacebook,
  SiInstagram,
  SiLinktree,
  SiOnlyfans,
  SiReddit,
  SiTiktok,
  SiTwitch,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { db, eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import { CreatorVideos } from "./_components/CreatorVideos";

const SITE_NAME = "SplitScreen";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  const creator = await db.query.creator.findFirst({
    where: eq(schema.creator.username, username),
  });

  if (!creator) {
    return {
      title: "Creator not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${creator.displayName} (@${creator.username})`;
  const description =
    creator.aliases.length > 0
      ? `View all videos featuring ${creator.displayName}. Also known as: ${creator.aliases.join(", ")}.`
      : `View all videos featuring ${creator.displayName}.`;

  return {
    title,
    description,
    keywords: [
      creator.displayName,
      creator.username,
      ...creator.aliases,
      "creator",
      "videos",
      "splitscreen",
    ],
    openGraph: {
      type: "profile",
      locale: "en_US",
      url: `${SITE_URL}/creators/${creator.username}`,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: creator.image
        ? [
            {
              url: creator.image,
              width: 400,
              height: 400,
              alt: creator.displayName,
            },
          ]
        : [
            {
              url: `${SITE_URL}/og-image.png`,
              width: 1200,
              height: 630,
              alt: `${SITE_NAME} - ${creator.displayName}`,
            },
          ],
    },
    twitter: {
      card: "summary",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: creator.image ? [creator.image] : [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/creators/${creator.username}`,
    },
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const creator = await db.query.creator.findFirst({
    where: eq(schema.creator.username, username),
    with: {
      links: true,
    },
  });

  if (!creator) {
    notFound();
  }

  // Calculate age from birthday
  const age = creator.birthday
    ? (() => {
        const today = new Date();
        const birthDate = new Date(creator.birthday);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          calculatedAge--;
        }
        return calculatedAge;
      })()
    : null;

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-10 px-6 py-12">
        <div className="flex items-center gap-6">
          <Avatar className="size-48">
            <AvatarImage src={creator.image ?? undefined} />
            <AvatarFallback>{creator.displayName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="font-bold text-4xl">{creator.displayName}</h1>
            {age !== null && (
              <p>
                <span className="text-muted-foreground">Age:</span> {age}
              </p>
            )}
            {creator.aliases.length > 0 && (
              <p>
                <span className="text-muted-foreground">Aliases:</span>{" "}
                {creator.aliases.map((alias, index) => (
                  <span key={alias}>
                    {alias}
                    {index < creator.aliases.length - 1 && (
                      <span className="text-muted-foreground">, </span>
                    )}
                  </span>
                ))}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {creator.links.length > 0 &&
                creator.links.map((link) => (
                  <SocialLink key={link.id} link={link.link} />
                ))}
            </div>
          </div>
        </div>

        <CreatorVideos creatorId={creator.id} />
      </div>
    </main>
  );
}

const getSocialIcon = (hostname: string, className?: string) => {
  hostname = hostname.toLowerCase();
  if (hostname.includes("x.com")) {
    return <SiX className={className} />;
  }
  if (hostname.includes("youtube.com")) {
    return <SiYoutube className={cn(className, "text-[#FF0000]")} />;
  }
  if (hostname.includes("tiktok.com")) {
    return <SiTiktok className={cn(className)} />;
  }

  if (hostname.includes("instagram.com")) {
    return <SiInstagram className={cn(className, "text-[#FF0069]")} />;
  }

  if (hostname.includes("facebook.com")) {
    return <SiFacebook className={cn(className, "text-[#0866FF]")} />;
  }

  if (hostname.includes("twitch.tv")) {
    return <SiTwitch className={cn(className, "text-[#9146FF]")} />;
  }

  if (hostname.includes("reddit.com")) {
    return <SiReddit className={cn(className, "text-[#FF4500]")} />;
  }

  if (hostname.includes("onlyfans.com")) {
    return <SiOnlyfans className={cn(className, "text-[#00AFF0]")} />;
  }

  if (hostname.includes("linktr")) {
    return <SiLinktree className={cn(className, "text-[#43E55E]")} />;
  }

  return <Link2 className={className} />;
};

const formatLink = (link: string) => {
  const url = new URL(link);

  if (url.hostname.toLowerCase().includes("reddit.com")) {
    // Examples:
    // url.pathname: '/user/spez'
    // url.pathname: '/u/spez'
    // url.pathname: '/'
    const parts = url.pathname.split("/").filter(Boolean); // filter out empty
    if ((parts[0] === "user" || parts[0] === "u") && parts[1]) {
      return `@${parts[1]}`;
    }
    return "reddit.com";
  }

  if (url.hostname === "x.com" || url.hostname === "twitter.com") {
    // Examples:
    // url.pathname: '/elonmusk'
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]) {
      return `${url.hostname.replace(/^www\./, "")}/${parts[0]}`;
    }
    return url.hostname.replace(/^www\./, "");
  }

  return url.hostname.replace(/^www\./, "");
};

const SocialLink = ({ link }: { link: string }) => {
  const hostname = formatLink(link);
  const icon = getSocialIcon(link);
  return (
    <Link
      className={buttonVariants({ variant: "secondary", className: "" })}
      href={link}
    >
      {icon}
      {hostname}
    </Link>
  );
};
