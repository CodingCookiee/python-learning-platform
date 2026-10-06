import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/public-origin";

/** Crawlers get the public pages; the app itself is behind sign-in and has nothing to index */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/dashboard",
        "/modules",
        "/lessons/",
        "/exercises/",
        "/checkpoints/",
        "/projects/",
        "/review",
        "/log",
        "/achievements",
        "/profile",
        "/settings",
        "/onboarding",
        // One-time links from emails
        "/auth/reset-password",
        "/auth/verify-email",
      ],
    },
    sitemap: `${publicOrigin()}/sitemap.xml`,
  };
}
