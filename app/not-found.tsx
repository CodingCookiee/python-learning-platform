import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { StatusPage } from "@/components/brand/status-page";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <StatusPage
          code="404"
          title="That page isn't on the syllabus."
          message="The link may be old or mistyped. Everything pylearn teaches starts from the home page."
          actions={[
            { label: "Go to the home page", href: "/" },
            { label: "Sign in", href: "/auth/signin", variant: "outline" },
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
