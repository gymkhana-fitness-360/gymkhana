"use strict";

import { Payment, Membership, Member, PaymentMethod, PaymentStatus, MemberStatus } from "@prisma/client";

/**
 * SHARED SERVICE TYPES
 * 
 * Centralized type definitions for service layer responses.
 * Avoids 'any' types throughout the codebase.
 */

/**
 * Payment with related data
 */
export interface PaymentWithRelations extends Payment {
  Member?: Pick<Member, "id" | "name" | "phone">;
}

/**
 * Membership with related data
 */
export interface MembershipWithRelations extends Membership {
  Member?: Pick<Member, "id" | "name" | "phone">;
  Plan?: {
    id: string;
    name: string;
    durationDays: number;
  };
}

/**
 * Member with related data
 */
export interface MemberWithRelations extends Member {
  Membership?: Membership[];
  Payment?: Payment[];
}

/**
 * Parsed payment from text
 */
export interface ParsedPaymentData {
  amount: number | null;
  method: PaymentMethod | null;
  name: string;
  duration: string | null;
  phone: string | null;
  date: Date | null;
  splitPayments: Array<{ amount: number; method: PaymentMethod }> | null;
}

/**
 * Bulk entry result
 */
export interface BulkEntryResult {
  member: string;
  amount: number;
  method?: string;
  methods?: string;
  payments: number;
  date: string;
}

/**
 * Bulk entry error
 */
export interface BulkEntryError {
  entry: string;
  error: string;
  parsed?: ParsedPaymentData;
  similarNames?: Array<{ id: string; name: string; phone: string }>;
  duplicate?: boolean;
  existingPayment?: {
    id: string;
    amount: number;
    method?: PaymentMethod;
    receivedAt: Date;
    memberName?: string;
  };
  /** Row-level validation / identity flags (UI: red row) */
  invalidDate?: boolean;
  invalidName?: boolean;
  ambiguousMember?: boolean;
  candidates?: Array<{ id: string; name: string; phone: string }>;
  needsPhoneInLine?: boolean;
  memberPreview?: { name: string; phoneMask: string };
}

/**
 * Member search result
 */
export interface MemberSearchResult {
  id: string;
  name: string;
  phone: string;
  status?: MemberStatus;
}

/**
 * Generic API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
