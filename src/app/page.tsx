import { Calendar, Filter, SortAsc } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db, desc } from "~/server/db";
import * as schema from "~/server/db/schema";
import { HydrateClient } from "~/trpc/server";
import { CategoriesCarousel } from "./_components/CategoriesCarousel";
import { VideoCard } from "./_components/VideoCard";

const SITE_NAME = "SplitScreen";
const SITE_DESCRIPTION =
  "Explore a curated collection of captivating splitscreen videos.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Watch and Share Amazing Videos`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "splitscreen",
    "video sharing",
    "watch videos",
    "upload videos",
    "content creators",
    "streaming",
    "video platform",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Watch and Share Amazing Videos`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Video Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Watch and Share Amazing Videos`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: `@${SITE_NAME.toLowerCase()}`,
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    // google: "your-google-site-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function Home() {
  const videos = await db
    .select()
    .from(schema.video)
    .orderBy(desc(schema.video.createdAt))
    .limit(24);

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <HydrateClient>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is safe
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <main>
        <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline">
              <Filter />
            </Button>

            <Select value="all-time">
              <SelectTrigger>
                <Calendar />
                <SelectValue placeholder="Select a time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value="newest">
              <SelectTrigger>
                <SortAsc />
                <SelectValue placeholder="Select a sorting option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most-views">Most Views</SelectItem>
                <SelectItem value="top-rated">Top Rated</SelectItem>
                <SelectItem value="longest">Longest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CategoriesCarousel />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} {...video} views={0} />
            ))}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
