export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-semibold text-3xl text-white">Page not found</h1>
        <p className="mt-3 text-gray-400">
          The content you’re looking for doesn’t exist or might have been
          removed.
        </p>
        <a
          className="mt-6 inline-block rounded bg-white px-4 py-2 font-medium text-black hover:opacity-90"
          href="/"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
