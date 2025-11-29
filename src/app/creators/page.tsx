import type { Metadata } from "next";
import { InfiniteCreatorGrid } from "./_components/InfiniteCreatorGrid";

const SITE_NAME = "SplitScreen";
const SITE_DESCRIPTION =
  "Browse all content creators on SplitScreen. Discover your favorite performers and their videos.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: "All Creators",
  description: SITE_DESCRIPTION,
  keywords: [
    "creators",
    "performers",
    "content creators",
    "splitscreen",
    "models",
    "artists",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/creators`,
    siteName: SITE_NAME,
    title: `All Creators | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - All Creators`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `All Creators | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: `@${SITE_NAME.toLowerCase()}`,
  },
  alternates: {
    canonical: `${SITE_URL}/creators`,
  },
};

export default async function CreatorsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All Creators",
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/creators`,
  };

  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is safe
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <main>
        <div className="container mx-auto max-w-7xl space-y-8 px-6 py-12">
          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
              All Creators
            </h1>
            <p className="text-muted-foreground">
              Browse content creators on SplitScreen
            </p>
          </div>

          <InfiniteCreatorGrid />
        </div>
      </main>
    </>
  );
}
