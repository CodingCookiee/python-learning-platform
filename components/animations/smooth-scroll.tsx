"use client";

interface SmoothScrollLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SmoothScrollLink({ href, children, className }: SmoothScrollLinkProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (href.startsWith("#")) {
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
