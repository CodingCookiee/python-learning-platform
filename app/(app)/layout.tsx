import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/animations";
import { StreakPing } from "@/components/gamification/streak-ping";
import { ToastProvider } from "@/components/ui/toast";
import { QuestPanel } from "@/components/quest/quest-panel";
import { SkipLink } from "@/components/layout/skip-link";
import { HashScroll } from "@/components/layout/hash-scroll";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        {/* Silent client component: pings streak endpoint once per browser session */}
        <StreakPing />
        {/* A link to a #section of another page lands on it once the page has streamed in */}
        <HashScroll />
        {/* Past the eight stops of the header, straight to the page */}
        <SkipLink href="#content">Skip to the content</SkipLink>
        <Navbar />
        <main id="content" tabIndex={-1} className="flex-1 focus:outline-none">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        {/* The first-session quest's guide; renders nothing unless a quest is in progress */}
        <QuestPanel />
      </div>
    </ToastProvider>
  );
}
