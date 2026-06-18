"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0];

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);
  const initRef = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (initRef.current == null) {
      initRef.current = true;
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

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
