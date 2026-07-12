import { z } from "zod";

export const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").or(
    z.string().transform((val) => parseFloat(val)).pipe(z.number().positive("Amount must be positive"))
  ),
  paymentMethod: z.enum(["UPI", "CASH", "MIXED", "CARD", "BANK_TRANSFER", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  receivedAt: z.string().min(1, "Payment date is required"),
  planId: z.string().optional(),
  duration: z.string().optional(),
});

export const quickPaymentSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["UPI", "CASH", "MIXED", "CARD", "BANK_TRANSFER", "OTHER"]),
  receivedAt: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
export type QuickPaymentFormData = z.infer<typeof quickPaymentSchema>;
