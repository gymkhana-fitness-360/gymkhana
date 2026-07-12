"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import type { GymOption } from "@/components/gym-selector";
import {
  MobileBottomNav,
  MobileSidebarCloseOnNavigate,
} from "@/components/dashboard/mobile-bottom-nav";
import { AssumeEmployeeViewBanner } from "@/components/dashboard/assume-employee-view-banner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Suspense } from "react";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { registerServiceWorker } from "@/lib/sw-register";

function PwaBootstrap() {
  React.useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}

export function DashboardShell({
  children,
  initialGyms = [],
  initialGymId = null,
}: {
  children: React.ReactNode;
  initialGyms?: GymOption[];
  initialGymId?: string | null;
}) {
  return (
    <LocaleProvider>
    <PwaBootstrap />
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "3rem",
      } as React.CSSProperties}
    >
      <Suspense fallback={null}>
        <AppSidebar
          variant="inset"
          collapsible="icon"
          side="left"
        />
      </Suspense>
      <SidebarInset className="min-h-screen overflow-x-hidden border-l border-border bg-muted/40 pb-[calc(4.25rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0">
        <MobileSidebarCloseOnNavigate />
        <SiteHeader initialGyms={initialGyms} initialGymId={initialGymId} />
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-4">
          <AssumeEmployeeViewBanner />
          {children}
        </div>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
    </LocaleProvider>
  );
}
