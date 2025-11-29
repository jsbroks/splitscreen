import type { Metadata } from "next";

import { HydrateClient } from "~/trpc/server";
import { InfiniteVideoGrid } from "../_components/InfiniteVideoGrid";

const SITE_NAME = "SplitScreen";
const SITE_DESCRIPTION =
  "Watch the most popular splitscreen videos of all time.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: "Popular Videos",
  description: SITE_DESCRIPTION,
  keywords: [
    "popular videos",
    "most viewed",
    "splitscreen",
    "top videos",
    "best videos",
    "all time favorites",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/popular`,
    siteName: SITE_NAME,
    title: `Popular Videos | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Popular Videos`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Popular Videos | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: `@${SITE_NAME.toLowerCase()}`,
  },
  alternates: {
    canonical: `${SITE_URL}/popular`,
  },
};

export default function PopularPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Popular Videos",
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/popular`,
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
              Popular Videos
            </h1>
            <p className="text-muted-foreground">
              Watch the most viewed videos of all time
            </p>
          </div>

          <InfiniteVideoGrid
            sortBy={{ field: "view_count", direction: "desc" }}
          />
        </div>
      </main>
    </HydrateClient>
  );
}
