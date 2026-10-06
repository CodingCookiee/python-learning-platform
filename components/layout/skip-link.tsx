/** The first focusable thing on a page: jumps keyboard users past the navigation to the content */
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      {children}
    </a>
  );
}
