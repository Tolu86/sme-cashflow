"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/empty-state";
import { useAuth } from "@/components/providers/auth-provider";
import { BusinessProvider } from "@/components/providers/business-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { SetupGuide } from "@/components/setup/setup-guide";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingScreen label="Signing you in..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <BusinessProvider>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-zinc-900">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
              {!profile?.businessId ? <OnboardingWizard /> : <SetupGuide>{children}</SetupGuide>}
            </div>
          </main>
        </div>
      </div>
    </BusinessProvider>
  );
}