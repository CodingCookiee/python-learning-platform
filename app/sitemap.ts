import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/public-origin";

/** The public pages. Everything else needs an account, so it isn't listed */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  return [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/auth/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${origin}/auth/signin`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
