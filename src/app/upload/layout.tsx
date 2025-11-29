import type { Metadata } from "next";

const SITE_NAME = "Split Haven";
const SITE_DESCRIPTION =
  "Upload and share your splitscreen videos with the community.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: "Upload Video",
  description: SITE_DESCRIPTION,
  keywords: [
    "upload",
    "upload video",
    "share video",
    "splitscreen",
    "video sharing",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/upload`,
    siteName: SITE_NAME,
    title: `Upload Video | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: `Upload Video | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: `${SITE_URL}/upload`,
  },
  robots: {
    index: false, // Don't index upload page
    follow: true,
  },
};

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
