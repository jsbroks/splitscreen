"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html className="dark dark:bg-black" lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <h1 className="font-semibold text-3xl text-white">
              Something went wrong
            </h1>
            <p className="mt-3 text-gray-400">
              An unexpected error occurred. Please try again.
            </p>
            <button
              className="mt-6 inline-block rounded bg-white px-4 py-2 font-medium text-black hover:opacity-90"
              onClick={() => reset()}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
