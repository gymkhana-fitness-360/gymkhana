"use client";

import useSWR from "swr";
import { useEffect } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
};

const swrOpts = {
  refreshInterval: 30000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
} as const;

export function useSidebarCounts() {
  // Single lightweight aggregate endpoint (server-side count/aggregate) instead of
  // pulling whole member/payment/attendance tables to the client every 30s.
  const { data: counts, mutate: mutateCounts } = useSWR(
    "/api/dashboard/sidebar-counts",
    fetcher,
    swrOpts,
  );

  const { data: overdueData, mutate: mutateOverdueCount } = useSWR(
    "/api/overdue/list",
    fetcher,
    swrOpts,
  );

  const { data: renewalsData, mutate: mutateRenewalsCount } = useSWR(
    "/api/renewals",
    fetcher,
    swrOpts,
  );

  // Listen for custom events to trigger immediate updates
  useEffect(() => {
    const refreshAll = () => {
      mutateCounts();
      mutateOverdueCount();
      mutateRenewalsCount();
    };
    const handleOverdueUpdate = () => {
      mutateOverdueCount();
    };

    window.addEventListener("member-updated", refreshAll);
    window.addEventListener("payment-updated", refreshAll);
    window.addEventListener("overdue-updated", handleOverdueUpdate);

    return () => {
      window.removeEventListener("member-updated", refreshAll);
      window.removeEventListener("payment-updated", refreshAll);
      window.removeEventListener("overdue-updated", handleOverdueUpdate);
    };
  }, [mutateCounts, mutateOverdueCount, mutateRenewalsCount]);

  const totalMembers = counts?.totalMembers ?? 0;
  const activeMembers = counts?.activeMembers ?? 0;
  const paymentsThisMonth = counts?.paymentsThisMonth ?? 0;
  const totalAmountThisMonth = counts?.totalAmountThisMonth ?? 0;
  const adminTasks = counts?.pendingAdminTasks ?? 0;

  // Renewals due (today + this week + this month) from the renewals endpoint.
  const renewalsThisMonth =
    (renewalsData?.today?.length || 0) +
    (renewalsData?.thisWeek?.length || 0) +
    (renewalsData?.thisMonth?.length || 0);

  return {
    members: {
      count: totalMembers,
      activeMembers,
      activeMembersLastMonth: 0,
      change: activeMembers,
    },
    payments: { count: paymentsThisMonth, totalAmount: totalAmountThisMonth },
    overdue: overdueData?.totalOverdue || 0,
    renewals: renewalsThisMonth,
    adminTasks,
  };
}
