import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Creator | Admin",
  description: "Update creator information",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditCreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
