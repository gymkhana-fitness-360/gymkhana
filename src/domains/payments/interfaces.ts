import type {
  BillDTO,
  CreatePaymentInputDTO,
  ListPaymentsParams,
  PaymentDTO,
  PaymentListResultDTO,
  PaymentOperationResultDTO,
  QuickEntryBatchResultDTO,
  QuickEntryInputDTO,
} from "./types";

export interface IPaymentListQueries {
  listPayments(params: ListPaymentsParams): Promise<PaymentListResultDTO>;
}

export interface IPaymentQueries {
  checkDuplicatePayment(
    memberId: string,
    gymId: string,
    amount: number,
    paymentDate: Date
  ): Promise<{ isDuplicate: boolean; existingPayment?: PaymentDTO }>;
}

export interface IPaymentService extends IPaymentQueries {
  createPayment(
    input: CreatePaymentInputDTO
  ): Promise<PaymentOperationResultDTO>;
  createBulkPayments(
    inputs: CreatePaymentInputDTO[]
  ): Promise<PaymentOperationResultDTO[]>;
  deleteDuplicatePayment(
    paymentId: string,
    userId: string,
    reason: string
  ): Promise<void>;
}

export interface IBillQueries {
  getBill(gymId: string, billId: string): Promise<BillDTO | null>;
  listBillsForMember(gymId: string, memberId: string): Promise<BillDTO[]>;
}

export interface IQuickEntryService {
  processBatch(
    input: QuickEntryInputDTO,
    gymId: string,
    userId: string
  ): Promise<QuickEntryBatchResultDTO>;
}
