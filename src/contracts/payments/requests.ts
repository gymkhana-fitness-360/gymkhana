import type { ListParams } from "../api-types";
import type { PaymentMethodWire, PaymentStatusWire } from "../enums";

export interface CreatePaymentRequest {
  memberId: string;
  amount: number;
  method: PaymentMethodWire;
  status?: PaymentStatusWire;
  reference?: string;
  notes?: string;
  packageDuration?: string;
  isPersonalTrainer?: boolean;
  friendsFamilyDiscount?: boolean;
  monthlyRate?: number;
  studentGymfloPlan?: boolean;
  specialOccasion?: string;
  receivedAt?: string;
}

export interface ListPaymentsRequest extends ListParams {
  memberId?: string;
  status?: PaymentStatusWire;
  method?: PaymentMethodWire;
}
