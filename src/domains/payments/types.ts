/**
 * Payments & billing DTOs.
 */

export type PaymentMethodValue =
  | "UPI"
  | "CASH"
  | "MIXED"
  | "CARD"
  | "BANK_TRANSFER"
  | "OTHER";

export type PaymentStatusValue = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface PaymentDTO {
  id: string;
  memberId: string;
  gymId: string;
  amount: number;
  paymentMethod: PaymentMethodValue;
  paymentDate: Date;
  receivedAt: Date;
  status: PaymentStatusValue;
  planId: string;
  notes: string | null;
  reference: string | null;
  recordedByUserId: string;
  createdAt: Date;
}

export interface BillLineItemDTO {
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

export interface BillDTO {
  id: string;
  gymId: string;
  memberId: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: "INR";
  lineItems: BillLineItemDTO[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
}

export interface CreatePaymentInputDTO {
  memberId: string;
  gymId: string;
  amount: number;
  paymentMethod: PaymentMethodValue;
  paymentDate: Date;
  planId: string;
  duration?: string | null;
  userId: string;
  notes?: string;
  recordOnly?: boolean;
  reference?: string | null;
  status?: PaymentStatusValue;
  packageDuration?: string | null;
  isPersonalTrainer?: boolean;
  friendsFamilyDiscount?: boolean;
  monthlyRate?: number | null;
  studentGymfloPlan?: boolean;
  specialOccasion?: string | null;
}

export interface PaymentOperationResultDTO {
  payment: PaymentDTO;
  membershipId: string | null;
  wasExtended: boolean;
  isDuplicate: boolean;
}

export interface ListPaymentsParams {
  gymId: string;
  search?: string;
  status?: PaymentStatusValue;
  method?: PaymentMethodValue;
  startDate?: string;
  endDate?: string;
  memberId?: string;
  limit?: number;
  includeStats?: boolean;
}

/** Row shape returned by GET /api/payments (dashboard-compatible). */
export interface PaymentListItemDTO {
  id: string;
  amount: number;
  method: PaymentMethodValue;
  status: PaymentStatusValue;
  reference: string | null;
  notes: string | null;
  packageDuration: string | null;
  isPersonalTrainer: boolean;
  friendsFamilyDiscount: boolean;
  monthlyRate: number | null;
  studentGymfloPlan: boolean;
  specialOccasion: string | null;
  receivedAt: Date;
  createdAt: Date;
  Member: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
  User: {
    id: string;
    name: string;
  };
}

export interface PaymentListStatsDTO {
  total: number;
  count: number;
  average: number;
  statusBreakdown: Array<{
    status: PaymentStatusValue;
    _sum: { amount: number | null };
    _count: { id: number };
  }>;
  methodBreakdown: Array<{
    method: PaymentMethodValue;
    _sum: { amount: number | null };
    _count: { id: number };
  }>;
  collectionByYear: Record<string, { total: number; count: number }>;
  totalFrom2023: { total: number; count: number };
}

export interface PaymentListResultDTO {
  payments: PaymentListItemDTO[];
  stats?: PaymentListStatsDTO;
}

export interface QuickEntryLineInputDTO {
  rawText: string;
}

export interface QuickEntryInputDTO {
  lines: QuickEntryLineInputDTO[];
}

export interface QuickEntryLineResultDTO {
  line: string;
  ok: boolean;
  error?: string;
}

export interface QuickEntryBatchResultDTO {
  success: boolean;
  results: QuickEntryLineResultDTO[];
}
