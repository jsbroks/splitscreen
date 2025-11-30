import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Transcode Jobs | Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TranscodeJobsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
