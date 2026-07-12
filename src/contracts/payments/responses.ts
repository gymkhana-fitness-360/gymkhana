import type { ApiMeta } from "../api-types";
import type { PaymentMethodWire, PaymentStatusWire } from "../enums";

export interface PaymentListItemWire {
  id: string;
  amount: number;
  method: PaymentMethodWire;
  status: PaymentStatusWire;
  reference?: string | null;
  notes?: string | null;
  receivedAt: string;
  member: {
    id: string;
    name: string;
    phone: string;
  };
  receivedBy: {
    name: string;
  };
}

export interface PaymentResponse {
  id: string;
  memberId: string;
  gymId: string;
  amount: number;
  method: PaymentMethodWire;
  status: PaymentStatusWire;
  reference?: string | null;
  notes?: string | null;
  receivedAt: string;
}

export interface PaymentListResponse {
  payments: PaymentListItemWire[];
  meta: ApiMeta;
}
