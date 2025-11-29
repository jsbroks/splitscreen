import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "~/components/ui/sonner";
import { getSession } from "~/server/better-auth/server";
import { TRPCReactProvider } from "~/trpc/react";
import { AgeVerification } from "./_components/AgeVerification";
import { Footer } from "./_components/Footer";
import { Navbar } from "./_components/Navbar";

const SITE_NAME = "Split Haven";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL ?? "https://splitscreen.com"),
  title: {
    default: `${SITE_NAME} - Watch and Share Amazing Videos`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Explore a curated collection of captivating splitscreen videos.",
  icons: [
    { rel: "icon", url: "/logo.svg" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html className={`${geist.variable} dark dark:bg-black`} lang="en">
      <head>
        <script
          data-website-id="ee09c5cc-7555-4da0-88fa-3dec245ee09f"
          defer
          src="https://cloud.umami.is/script.js"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <NuqsAdapter>
          <TRPCReactProvider>
            <Navbar user={session?.user} />
            <div className="mb-24 flex-1">{children}</div>
            <Footer />
            <AgeVerification />
            <Toaster />
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
