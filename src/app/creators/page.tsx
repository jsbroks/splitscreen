import type { Metadata } from "next";
import Link from "next/link";
import { api } from "~/trpc/server";

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
  const creators = await api.creators.list();

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
              Browse {creators.length} content creator
              {creators.length !== 1 ? "s" : ""} on SplitScreen
            </p>
          </div>

          {creators.length === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <p className="text-muted-foreground">No creators found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {creators.map((creator) => {
                // Calculate age from birthday
                const age = creator.birthday
                  ? (() => {
                      const today = new Date();
                      const birthDate = new Date(creator.birthday);
                      let calculatedAge =
                        today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();
                      if (
                        monthDiff < 0 ||
                        (monthDiff === 0 &&
                          today.getDate() < birthDate.getDate())
                      ) {
                        calculatedAge--;
                      }
                      return calculatedAge;
                    })()
                  : null;

                return (
                  <Link
                    className="group"
                    href={`/creator/${creator.username}`}
                    key={creator.id}
                  >
                    <div className="relative h-64 overflow-hidden rounded-lg border transition-all hover:shadow-lg">
                      {/* Background Image */}
                      <div
                        className="absolute inset-0 bg-center bg-cover transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundImage: creator.image
                            ? `url(${creator.image})`
                            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      >
                        {/* Dark overlay gradient */}
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                      </div>

                      {/* Content Banner */}
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="space-y-1">
                          <h3 className="line-clamp-1 font-bold text-lg text-white">
                            {creator.displayName}
                          </h3>
                          <div className="text-xs">
                            <span>{age} years old</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
