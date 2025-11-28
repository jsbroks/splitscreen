import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
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

  return <>{children}</>;
}
