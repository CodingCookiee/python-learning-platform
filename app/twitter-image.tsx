import { ogCard } from "@/lib/og-card";

export const alt = "pylearn: earn your black belt in Python";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return ogCard();
}
