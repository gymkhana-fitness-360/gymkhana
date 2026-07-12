"use client";

import { useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { createLogger } from "@/lib/logger";

const logger = createLogger("use-session-timeout");

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"];

/**
 * Role-based session timeouts (minutes)
 * Admins have SHORTER timeouts - they are high-value targets
 */
const ROLE_TIMEOUTS: Record<string, number> = {
  ADMIN: 60,      // 1 hour - highest security
  SUB_ADMIN: 120, // 2 hours
  STAFF: 240,     // 4 hours
};
const DEFAULT_TIMEOUT = 240;

/**
 * Tracks user activity and signs out after role-based inactivity timeout.
 * All users including admins are subject to timeout (admins have shorter timeout).
 */
export function useSessionTimeout() {
  const { data: session, status } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTimeoutMinutes = useCallback(() => {
    const role = session?.user?.role;
    if (!role) return DEFAULT_TIMEOUT;
    return ROLE_TIMEOUTS[role] || DEFAULT_TIMEOUT;
  }, [session?.user?.role]);

  const scheduleLogout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    const timeoutMinutes = getTimeoutMinutes();
    const ms = timeoutMinutes * 60 * 1000;
    const elapsed = Date.now() - lastActivityRef.current;
    const remaining = Math.max(0, ms - elapsed);

    // Warning 2 minutes before logout
    const warningTime = Math.max(0, remaining - 2 * 60 * 1000);
    if (warningTime > 0) {
      warningTimerRef.current = setTimeout(() => {
        // Could show a toast/modal here
        logger.warn("[Session] Will expire in 2 minutes due to inactivity");
      }, warningTime);
    }

    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login?reason=timeout" });
    }, remaining);
  }, [getTimeoutMinutes]);

  const onActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    scheduleLogout();

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity);
    }
    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [status, session, scheduleLogout, onActivity]);
}
