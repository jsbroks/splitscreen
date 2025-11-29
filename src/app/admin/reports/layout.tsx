import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Reports | Admin",
  description: "Review and manage reported videos",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
