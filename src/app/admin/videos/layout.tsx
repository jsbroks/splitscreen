import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pending Videos | Admin",
  description: "Review and manage videos awaiting approval",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VideosAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
