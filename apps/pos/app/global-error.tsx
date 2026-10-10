'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>Jerzyfy POS unavailable</h1>
            <p style={{ marginTop: 12, fontSize: 14 }}>Reload the register. Carts are kept on the server.</p>
            <button type="button" style={{ marginTop: 24, textDecoration: 'underline' }} onClick={reset}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
