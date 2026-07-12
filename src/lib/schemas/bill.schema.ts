import { z } from "zod";

export const billSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  programType: z.enum(["MAINTENANCE", "BODYBUILDING", "WEIGHT_LOSS"]),
  amount: z.number().positive("Amount must be positive").optional().or(
    z.string().transform((val) => val ? parseFloat(val) : undefined).optional()
  ),
  paymentMethod: z.enum(["UPI", "CASH", "MIXED", "CARD", "BANK_TRANSFER", "OTHER"]),
  month: z.string().min(1, "Month is required"),
  validFrom: z.string().min(1, "Start date is required"),
  validTo: z.string().min(1, "End date is required"),
  nextPaymentDate: z.string().optional(),
  workoutPlan: z.string().min(1, "Workout plan is required"),
  hideAmount: z.boolean().default(false),
  notes: z.string().optional(),
});

export type BillFormData = z.infer<typeof billSchema>;
