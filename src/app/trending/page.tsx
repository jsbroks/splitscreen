import type { Metadata } from "next";

import { HydrateClient } from "~/trpc/server";
import { InfiniteVideoGrid } from "../_components/InfiniteVideoGrid";

const SITE_NAME = "Split Haven";
const SITE_DESCRIPTION =
  "Discover trending splitscreen videos that are gaining popularity right now.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: "Trending Videos",
  description: SITE_DESCRIPTION,
  keywords: [
    "trending videos",
    "popular",
    "splitscreen",
    "viral videos",
    "hot content",
    "trending now",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/trending`,
    siteName: SITE_NAME,
    title: `Trending Videos | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Trending Videos`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Trending Videos | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: `@${SITE_NAME.toLowerCase()}`,
  },
  alternates: {
    canonical: `${SITE_URL}/trending`,
  },
};

export default function TrendingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Trending Videos",
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/trending`,
  };

  return (
    <HydrateClient>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is safe
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <main>
        <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
              Trending Videos
            </h1>
            <p className="text-muted-foreground">
              Discover what's hot right now on Split Haven
            </p>
          </div>

          <InfiniteVideoGrid
            sortBy={{ field: "popularity_score", direction: "desc" }}
          />
        </div>
      </main>
    </HydrateClient>
  );
}
