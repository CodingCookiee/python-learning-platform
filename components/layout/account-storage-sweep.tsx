"use client";

import { useEffect } from "react";
import { sweepLegacyStorage } from "@/lib/account-storage";

/** Clears drafts left under the old shared keys (lib/account-storage.ts). Renders nothing */
export function AccountStorageSweep() {
  useEffect(() => sweepLegacyStorage(), []);
  return null;
}
