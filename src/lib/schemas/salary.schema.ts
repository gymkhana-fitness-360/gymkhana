import { z } from "zod";

export const salarySchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.number().positive("Amount must be positive").or(
    z.string().transform((val) => parseFloat(val)).pipe(z.number().positive("Amount must be positive"))
  ),
  paymentDate: z.string().min(1, "Payment date is required"),
  month: z.number().int().min(1).max(12, "Invalid month"),
  year: z.number().int().min(2020).max(2100, "Invalid year"),
  method: z.enum(["UPI", "CASH", "MIXED", "CARD", "BANK_TRANSFER", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type SalaryFormData = z.infer<typeof salarySchema>;
