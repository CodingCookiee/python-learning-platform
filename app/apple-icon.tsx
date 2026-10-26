import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon for iPhones and iPads: the knot mark from app/icon.svg, drawn at 180px on a
 * full square (iOS rounds the corners itself, so the ground runs to the edge).
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef5ec",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 32 32">
          <g fill="#2f8a6c" stroke="#1d3b31" strokeWidth="1.25" strokeLinejoin="miter">
            <rect x="1.5" y="8.5" width="29" height="6" />
            <path d="M13.6 15.5 L17.4 15.5 L12.2 28.6 L8.4 27.4 Z" />
            <path d="M14.6 15.5 L18.4 15.5 L23.6 27.4 L19.8 28.6 Z" />
            <rect x="11.5" y="5.5" width="9" height="11" />
          </g>
          <path d="M11.5 8.2 L20.5 13.8" stroke="#1d3b31" strokeWidth="1.25" fill="none" />
        </svg>
      </div>
    ),
    size
  );
}
