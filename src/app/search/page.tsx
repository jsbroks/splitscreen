import type { Metadata } from "next";
import { SearchContent } from "./SearchContent";

const SITE_NAME = "Split Haven";
const SITE_DESCRIPTION =
  "Search for splitscreen videos. Find your favorite content and creators.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: "Search Videos",
  description: SITE_DESCRIPTION,
  keywords: ["search", "videos", "splitscreen", "find videos", "video search"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/search`,
    siteName: SITE_NAME,
    title: `Search Videos | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Search Videos`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Search Videos | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: `@${SITE_NAME.toLowerCase()}`,
  },
  alternates: {
    canonical: `${SITE_URL}/search`,
  },
};

export default function SearchPage() {
  return <SearchContent />;
}
