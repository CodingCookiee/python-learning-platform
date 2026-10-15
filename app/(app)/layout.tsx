import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/animations";
import { StreakPing } from "@/components/gamification/streak-ping";
import { ToastProvider } from "@/components/ui/toast";
import { QuestPanel } from "@/components/quest/quest-panel";
import { SkipLink } from "@/components/layout/skip-link";
import { HashScroll } from "@/components/layout/hash-scroll";
import { SenseiAssistant } from "@/components/sensei/sensei-assistant";
import { auth } from "@/auth";
import { AccountStorageSweep } from "@/components/layout/account-storage-sweep";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Marks the page with the signed-in account, so per-account browser storage (drafts, the Sensei's
  // chat) is keyed to it (lib/account-storage.ts)
  const session = await auth();
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col" data-account={session?.user?.id ?? ""}>
        <AccountStorageSweep />
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
        {/* The Sensei: help on any page, bottom-right (stands aside on drills and gradings) */}
        <SenseiAssistant />
      </div>
    </ToastProvider>
  );
}
