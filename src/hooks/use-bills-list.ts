import useSWR from "swr";
import { swrFetcher } from "@/lib/swr/fetcher";

export interface BillListItem {
  id: string;
  billNumber: string;
  programType: string;
  amount: string | null;
  paymentMethod: string;
  month: string;
  validFrom: string;
  validTo: string;
  hideAmount: boolean;
  createdAt: string;
  status: string;
  dueAmount: string | number;
  paidAmount: string | number;
  member?: {
    id: string;
    name: string;
    phone: string;
    externalId: string | null;
  };
  Member?: {
    id: string;
    name: string;
    phone: string;
    externalId?: string | null;
  };
  generatedBy?: { name: string };
  User?: { name: string };
}

export interface PaymentNotSent {
  id: string;
  amount: string;
  method: string;
  receivedAt: string;
  packageDuration: string | null;
  Member: { id: string; name: string; phone: string; externalId: string | null };
  User: { name: string };
}

export interface RenewalCandidate {
  id: string;
  name: string;
  phone: string;
  nextRenewalDate: string | null;
}

export function useBillsList() {
  const {
    data: bills = [],
    isLoading: billsLoading,
    mutate: mutateBills,
  } = useSWR<BillListItem[]>("/api/bills", swrFetcher);

  return { bills, billsLoading, mutateBills };
}

export function usePaymentsNotSent(enabled: boolean) {
  const { data, isLoading, mutate } = useSWR<{ payments?: PaymentNotSent[] }>(
    enabled ? "/api/payments/sent-status" : null,
    swrFetcher,
  );

  return {
    paymentsNotSent: data?.payments ?? [],
    paymentsLoading: isLoading,
    mutatePaymentsNotSent: mutate,
  };
}

export function useRenewalReminderCandidates(
  enabled: boolean,
  lookback: string,
  fromDate: string,
) {
  const key = enabled
    ? (() => {
        const params = new URLSearchParams();
        if (fromDate) params.set("fromDate", fromDate);
        else params.set("lookback", lookback);
        return `/api/renewals/reminder-candidates?${params}`;
      })()
    : null;

  const { data, isLoading, mutate } = useSWR<{
    dueIn7Days?: RenewalCandidate[];
    dueIn3Days?: RenewalCandidate[];
  }>(key, swrFetcher);

  return {
    dueIn7Days: data?.dueIn7Days ?? [],
    dueIn3Days: data?.dueIn3Days ?? [],
    remindersLoading: isLoading,
    mutateReminderCandidates: mutate,
  };
}
