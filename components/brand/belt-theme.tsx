"use client";

import * as React from "react";
import type { BeltKey } from "@/lib/ranks";

/**
 * Puts the learner's belt on <html> (data-belt), so the loader everywhere is tied in their own
 * colour. Set by the app's header, which knows the rank. Renders nothing.
 */
export function BeltTheme({ belt }: { belt: BeltKey }) {
  React.useEffect(() => {
    document.documentElement.dataset.belt = belt;
  }, [belt]);
  return null;
}
