"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0];

// Rendered on the server too, so next-themes' inline script sets the theme
// class before first paint (no light flash for dark-mode users).
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="app-theme"
      {...props}
    >
      {/* Every framer-motion animation follows the learner's reduced-motion setting: movement goes,
          fades stay (globals.css does the same for CSS animations) */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
