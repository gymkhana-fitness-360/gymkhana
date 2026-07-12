"use client";

import { useSyncExternalStore } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const ASSUME_EMPLOYEE_VIEW_STORAGE_KEY = "fitness360_assume_employee_view";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("assume-employee-view-changed", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("assume-employee-view-changed", onStoreChange);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ASSUME_EMPLOYEE_VIEW_STORAGE_KEY) === "1";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useAssumeEmployeeView(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setAssumeEmployeeView(
  enabled: boolean,
  options?: { router?: AppRouterInstance; navigate?: boolean },
): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(ASSUME_EMPLOYEE_VIEW_STORAGE_KEY, "1");
  } else {
    window.localStorage.removeItem(ASSUME_EMPLOYEE_VIEW_STORAGE_KEY);
  }
  window.dispatchEvent(new Event("assume-employee-view-changed"));

  const router = options?.router;
  if (options?.navigate !== false && router) {
    router.push(enabled ? "/dashboard/members" : "/dashboard");
  }
}

export function exitAssumeEmployeeView(router?: AppRouterInstance): void {
  setAssumeEmployeeView(false, { router, navigate: true });
}

export function enterAssumeEmployeeView(router?: AppRouterInstance): void {
  setAssumeEmployeeView(true, { router, navigate: true });
}
