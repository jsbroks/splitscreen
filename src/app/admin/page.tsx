import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

export default async function AdminPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  const user = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (!user?.isAdmin) {
    redirect("/");
  }

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
        </div>
      </div>
    </main>
  );
}
