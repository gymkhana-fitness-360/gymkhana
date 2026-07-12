import { z } from "zod";

export const memberSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(100, "Name too long"),
  contactNumber: z.string().regex(/^\d{10}$/, "Must be 10 digits"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const memberEditSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  phone: z.string().regex(/^\d{10}$/, "Must be 10 digits"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED"]),
});

export type MemberFormData = z.infer<typeof memberSchema>;
export type MemberEditFormData = z.infer<typeof memberEditSchema>;
