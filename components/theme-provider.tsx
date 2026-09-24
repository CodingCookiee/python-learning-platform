"use client";

import * as React from "react";
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
      {children}
    </NextThemesProvider>
  );
}
