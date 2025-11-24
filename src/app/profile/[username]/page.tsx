export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-3 px-6 py-12">
        <h1 className="font-bold text-2xl">{username}</h1>
      </div>
    </main>
  );
}
