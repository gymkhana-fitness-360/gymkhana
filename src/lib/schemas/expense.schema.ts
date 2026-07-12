import { z } from "zod";

export const expenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  category: z.enum([
    "RENT",
    "UTILITIES",
    "EQUIPMENT",
    "MAINTENANCE",
    "MARKETING",
    "SUPPLIES",
    "INSURANCE",
    "PROFESSIONAL_SERVICES",
    "SOFTWARE_SUBSCRIPTION",
    "TRAVEL",
    "OTHER",
  ]),
  type: z.enum(["RECURRING", "ONE_TIME"]).default("ONE_TIME"),
  amount: z.number().positive("Amount must be positive").or(
    z.string().transform((val) => parseFloat(val)).pipe(z.number().positive("Amount must be positive"))
  ),
  paymentDate: z.string().min(1, "Payment date is required"),
  method: z.enum(["UPI", "CASH", "MIXED", "CARD", "BANK_TRANSFER", "OTHER"]),
  vendor: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  nextDueDate: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
