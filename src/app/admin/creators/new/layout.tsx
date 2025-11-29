import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create New Creator | Admin",
  description: "Add a new creator to the platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewCreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
