"use client";

// Last resort when the root layout itself fails: no app CSS or fonts are
// guaranteed here, so the page carries its own minimal palette inline.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1f6f0",
          color: "#1d3b31",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#4a6356" }}>pylearn</p>
          <h1 style={{ fontSize: "2.25rem", lineHeight: 1.1, margin: "0.5rem 0 1rem" }}>
            Something went wrong loading pylearn.
          </h1>
          <p style={{ lineHeight: 1.6, color: "#4a6356" }}>
            Your progress is saved on the server. Reload the page, or try again in a minute.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#2f8a6c",
              color: "#fff",
              border: 0,
              borderRadius: "2px",
              padding: "0.75rem 1.25rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
