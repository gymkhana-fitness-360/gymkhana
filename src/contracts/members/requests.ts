import type { ListParams } from "../api-types";
import type { GenderWire, MemberStatusWire, PaymentMethodWire } from "../enums";

export interface CreateMemberRequest {
  name: string;
  phone: string;
  email?: string;
  gender?: GenderWire;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  planId: string;
  startDate: string;
  amount: number;
  paymentMethod: PaymentMethodWire;
  paymentReference?: string;
  packageDuration?: string;
  isPersonalTrainer?: boolean;
  friendsFamilyDiscount?: boolean;
  monthlyRate?: number;
  studentOrGymfloPlan?: boolean;
  specialOccasion?: string;
}

export interface UpdateMemberRequest {
  name?: string;
  phone?: string;
  email?: string;
  gender?: GenderWire;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  status?: MemberStatusWire;
}

export interface ListMembersRequest extends ListParams {
  status?: MemberStatusWire;
  /** Query param used by `/api/members` — expiry windows. */
  expiryFilter?: "expired_7" | "expired_30" | "expires_7" | "expires_30";
}
