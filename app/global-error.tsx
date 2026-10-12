"use client";

// Last resort when the root layout itself fails: no app CSS or fonts are
// guaranteed here, so the page carries its own minimal palette inline: DESIGN.md's
// light tokens converted to hex (Background, Forest Ink, Muted Ink, Jade and its
// foreground; Jade's button text is 5:1).
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
          background: "#f1f8f1",
          color: "#162c21",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#455c4f" }}>pylearn</p>
          <h1 style={{ fontSize: "2.25rem", lineHeight: 1.1, margin: "0.5rem 0 1rem" }}>
            Something went wrong loading pylearn.
          </h1>
          <p style={{ lineHeight: 1.6, color: "#455c4f" }}>
            Your progress is saved on the server. Reload the page, or try again in a minute.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#0f7c55",
              color: "#f6fcf6",
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
