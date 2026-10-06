import { ImageResponse } from "next/og";

/**
 * The share card for links to pylearn (Open Graph and Twitter), drawn from the logo's
 * colours: jade belt on the cotton background, ink outlines.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "pylearn: earn your black belt in Python";

const COTTON = "#eef5ec";
const JADE = "#2f8a6c";
const INK = "#1d3b31";
const MUTED = "#4d665b";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g fill="${JADE}" stroke="${INK}" stroke-width="1.25" stroke-linejoin="miter">
    <rect x="1.5" y="8.5" width="29" height="6"/>
    <path d="M13.6 15.5 L17.4 15.5 L12.2 28.6 L8.4 27.4 Z"/>
    <path d="M14.6 15.5 L18.4 15.5 L23.6 27.4 L19.8 28.6 Z"/>
    <rect x="11.5" y="5.5" width="9" height="11"/>
  </g>
  <path d="M11.5 8.2 L20.5 13.8" stroke="${INK}" stroke-width="1.25" fill="none"/>
</svg>`;

export function ogCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: COTTON,
          padding: "72px 80px",
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`} width={96} height={96} alt="" />
          <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>pylearn</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>Earn your black belt in Python</span>
          <span style={{ fontSize: 34, lineHeight: 1.35, color: MUTED, maxWidth: 960 }}>
            A graded path from first syntax to advanced Python, then AI automation. Lessons, drills and gradings run in
            your browser.
          </span>
        </div>
        {/* The six belts, white to black (the --belt-* tokens in globals.css), as a rank strip */}
        <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", border: `1px solid ${INK}` }}>
          {["#fdfcf6", "#f0d680", "#7cb57d", "#6099c1", "#946e50", "#203329"].map((c) => (
            <div key={c} style={{ flex: 1, background: c, borderRight: `2px solid ${COTTON}` }} />
          ))}
        </div>
      </div>
    ),
    OG_SIZE
  );
}
