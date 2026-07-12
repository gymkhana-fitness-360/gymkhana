import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  contactNumber: z.string().regex(/^\d{10}$/, "Must be 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["ADMIN", "SUB_ADMIN"]),
  isActive: z.boolean().default(true),
  isTrainer: z.boolean().default(false),
  commissionRate: z.number().min(0).max(100).optional().or(
    z.string().transform((val) => val ? parseFloat(val) : undefined).optional()
  ),
});

export const userEditSchema = userSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

export const loginSchema = z.object({
  contactNumber: z.string().min(1, "Contact number is required"),
  password: z.string().min(1, "Password is required"),
});

export type UserFormData = z.infer<typeof userSchema>;
export type UserEditFormData = z.infer<typeof userEditSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
