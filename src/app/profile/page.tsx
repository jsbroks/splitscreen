import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function ProfileRoot() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }
  const username = session.user.username || session.user.name || "me";
  redirect(`/profile/${username}`);
}
