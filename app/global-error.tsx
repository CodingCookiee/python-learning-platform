"use client";

// Last resort when the root layout itself fails: no app CSS or fonts are guaranteed here, so the
// page carries its own minimal palette inline: DESIGN.md's tokens converted to hex (Background,
// Forest Ink, Muted Ink, Jade and its foreground), light by default and the evening hall's forest
// green when the system is dark. Jade's button text is 5:1 or better in both.
const STYLES = `
.ge-body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 1rem; font-family: system-ui, sans-serif; background: #f1f8f1; color: #162c21; }
.ge-muted { color: #455c4f; }
.ge-button { margin-top: 1.5rem; background: #0f7c55; color: #f6fcf6; border: 0; border-radius: 2px;
  padding: 0.75rem 1.25rem; font-size: 1rem; font-weight: 600; cursor: pointer; }
@media (prefers-color-scheme: dark) {
  .ge-body { background: #0c1b14; color: #e7f0e6; }
  .ge-muted { color: #a5bba9; }
  .ge-button { background: #78d59d; color: #082016; }
}
`;

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="ge-body">
        <style>{STYLES}</style>
        <div style={{ maxWidth: "32rem" }}>
          <p className="ge-muted" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            pylearn
          </p>
          <h1 style={{ fontSize: "2.25rem", lineHeight: 1.1, margin: "0.5rem 0 1rem" }}>
            Something went wrong loading pylearn.
          </h1>
          <p className="ge-muted" style={{ lineHeight: 1.6 }}>
            Your progress is saved on the server. Reload the page, or try again in a minute.
          </p>
          <button type="button" onClick={reset} className="ge-button">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
