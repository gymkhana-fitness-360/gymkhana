"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { ThemeProvider } from "@/contexts/theme-context";

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 min - dedupe requests within 1 min
  keepPreviousData: true,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider>
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
