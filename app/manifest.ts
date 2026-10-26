import type { MetadataRoute } from "next";

/**
 * The web app manifest: what a phone shows when pylearn is added to the home screen. Colours are the
 * light theme's ground and jade (the same values as app/icon.svg); the icons are the knot mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pylearn: earn your black belt in Python",
    short_name: "pylearn",
    description:
      "Learn Python from first syntax to advanced, then AI automation. Train in the browser, pass gradings, earn your belts.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eef5ec",
    theme_color: "#2f8a6c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
