import type { Metadata } from "next";
import { count, db, desc, eq } from "~/server/db";
import * as schema from "~/server/db/schema";
import { HydrateClient } from "~/trpc/server";
import { VideoDiscovery } from "./_components/VideoDiscovery";

const SITE_NAME = "Split Haven";
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
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function Home() {
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

  // Query to get the 10 most used tags (by number of videos)
  const topTags = await db
    .select({
      id: schema.tag.id,
      name: schema.tag.name,
      slug: schema.tag.slug,
      count: count(schema.videoTag.id),
    })
    .from(schema.tag)
    .leftJoin(schema.videoTag, eq(schema.tag.id, schema.videoTag.tagId))
    .groupBy(schema.tag.id, schema.tag.name, schema.tag.slug)
    .orderBy(desc(count(schema.videoTag.id)))
    .limit(10);

  return (
    <HydrateClient>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is safe
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <main>
        <VideoDiscovery tags={topTags} />
      </main>
    </HydrateClient>
  );
}
