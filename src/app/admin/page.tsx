import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TypesenseSync } from "./_components/TypesenseSync";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Manage content and settings on Split Haven",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div>
          <h1 className="font-bold text-3xl">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your platform content and settings
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Creators</CardTitle>
              <CardDescription>Manage creators on the platform</CardDescription>
              <Button asChild className="mt-4">
                <Link href="/admin/creators">Manage Creators</Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Videos</CardTitle>
              <CardDescription>
                Review and approve pending videos
              </CardDescription>
              <Button asChild className="mt-4">
                <Link href="/admin/videos">Review Videos</Link>
              </Button>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Review and manage video reports</CardDescription>
              <Button asChild className="mt-4">
                <Link href="/admin/reports">View Reports</Link>
              </Button>
            </CardHeader>
          </Card>

          <TypesenseSync />
        </div>
      </div>
    </main>
  );
}
