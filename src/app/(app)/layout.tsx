"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/empty-state";
import { useAuth } from "@/components/providers/auth-provider";
import { BusinessProvider } from "@/components/providers/business-provider";
import { Sidebar, MobileNavigation } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OnboardingTour } from "@/components/onboarding/tour";
import { SetupGuide } from "@/components/setup/setup-guide";
import { TrialBanner } from "@/components/layout/trial-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Retire legacy appearance preferences across the authenticated app.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    window.localStorage.removeItem("cashflow-theme");
  }, []);

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
      <div className="flex h-screen overflow-hidden bg-[#f8f9ff] dark:bg-[#080f1c]">
        <div className="hidden w-64 shrink-0 border-r border-[#203b4a] bg-[#0e2130] lg:block">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-[#0e2130] shadow-2xl">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <TrialBanner />
          <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
              {!profile?.businessId ? (
                <OnboardingWizard />
              ) : (
                <SetupGuide>{children}</SetupGuide>
              )}
            </div>
          </main>
          <MobileNavigation />
        </div>
      </div>

      <OnboardingTour />
    </BusinessProvider>
  );
}