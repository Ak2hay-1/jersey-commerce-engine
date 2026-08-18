'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-semibold">Store unavailable</h1>
            <p className="mt-3 text-sm">Please refresh the page or try again in a moment.</p>
            <button type="button" className="mt-6 underline" onClick={reset}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
