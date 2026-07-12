"use client";

import { useSessionTimeout } from "@/hooks/useSessionTimeout";

/**
 * Wraps dashboard content and enforces session timeout on inactivity.
 * Must be used inside SessionProvider.
 */
export function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useSessionTimeout();
  return <>{children}</>;
}
