import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/animations";
import { StreakPing } from "@/components/gamification/streak-ping";
import { ToastProvider } from "@/components/ui/toast";
import { QuestPanel } from "@/components/quest/quest-panel";

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
        <Navbar />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        {/* The first-session quest's guide; renders nothing unless a quest is in progress */}
        <QuestPanel />
      </div>
    </ToastProvider>
  );
}
