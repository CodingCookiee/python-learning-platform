import { Suspense } from "react";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { headers } from "next/headers";
import { publicOrigin } from "@/lib/public-origin";

// One family across the width axis: condensed for ranks, normal for reading
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const DESCRIPTION =
  "A graded path from first Python syntax to advanced Python, then AI automation. Lessons, drills and gradings run in your browser. Free, no experience needed.";

export const metadata: Metadata = {
  // Absolute URLs for canonical links and the share card (app/opengraph-image.tsx)
  metadataBase: new URL(publicOrigin()),
  title: {
    default: "pylearn: earn your black belt in Python",
    template: "%s · pylearn",
  },
  description: DESCRIPTION,
  applicationName: "pylearn",
  openGraph: {
    type: "website",
    siteName: "pylearn",
    title: "pylearn: earn your black belt in Python",
    description: DESCRIPTION,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "pylearn: earn your black belt in Python",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111d18" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The per-request nonce from proxy.ts, for next-themes' inline script. Reading headers also
  // makes every page render per request, which a nonce needs.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn("h-full antialiased", archivo.variable, jetbrainsMono.variable)}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider nonce={nonce}>
          {/* The bar at the top while the next page loads */}
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
