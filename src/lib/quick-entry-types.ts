"use strict";

import type { PaymentMethod } from "@prisma/client";

/** One row in bulk quick-entry error list (matches API shape). */
export type BulkQuickEntryError = {
  entry: string;
  error?: string;
  invalidDate?: boolean;
  invalidName?: boolean;
  needsPhoneInLine?: boolean;
  ambiguousMember?: boolean;
  duplicate?: boolean;
  existingPayment?: {
    id: string;
    amount: number;
    receivedAt: string | Date;
    method?: PaymentMethod;
    memberName?: string;
  };
  memberPreview?: { name: string; phoneMask: string };
  candidates?: Array<{ id: string; name: string; phone: string }>;
  similarNames?: Array<{ id: string; name: string; phone: string }>;
  parsed?: unknown;
};

export type BulkQuickEntrySuccessRow = {
  member?: string;
  amount?: number;
  method?: string;
  methods?: string;
  date?: string;
};

/** Client-side state for quick-entry API responses (single + bulk). */
export type QuickEntryResultState = {
  success?: boolean;
  bulk?: boolean;
  processed?: number;
  failed?: number;
  results?: BulkQuickEntrySuccessRow[];
  errors?: BulkQuickEntryError[];
  message?: string;
  error?: string;
  details?: string;
  duplicate?: boolean;
  suggestion?: string;
  existingPayment?: BulkQuickEntryError["existingPayment"];
  needsPhoneVerification?: boolean;
  ambiguousMember?: boolean;
  candidates?: Array<{ id: string; name: string; phone: string }>;
  pendingMemberId?: string;
  phoneMask?: string;
  invalidDate?: boolean;
  invalidName?: boolean;
  phoneMismatch?: boolean;
  similarNames?: Array<{ id: string; name: string; phone: string }>;
  payment?: {
    amount?: unknown;
    method?: PaymentMethod;
    receivedAt?: string;
    Member?: { name?: string };
  };
  /** Set by API on success for clients that need member without Prisma include */
  memberName?: string;
  paymentAmount?: number;
};
