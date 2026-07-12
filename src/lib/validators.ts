import { z } from "zod";
import { MemberStatus, Gender, PaymentMethod, PaymentStatus, AttendanceMethod, WalkInVisitKind } from "@prisma/client";

// ============ MEMBER VALIDATORS ============

export const createMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  // The UI sends "" when no gender is picked; treat that as "not provided".
  gender: z.nativeEnum(Gender).optional().or(z.literal("").transform(() => undefined)),
  // Accept "" (not provided) or a calendar date / ISO datetime (the date input sends "YYYY-MM-DD").
  dateOfBirth: z
    .union([
      z.literal(""),
      z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
    ])
    .optional(),
  address: z.string().max(500).optional().or(z.literal("")),
  emergencyContact: z.string().max(100).optional().or(z.literal("")),
  id: z.string().regex(/^MEM-\d+$/, "Invalid Member ID format (must be MEM-XXX)").optional(),
  
  // Membership
  planId: z.string().optional().or(z.literal("")),
  // Accept a calendar date ("YYYY-MM-DD", as the UI sends) or a full ISO datetime.
  // The service normalizes to a storage calendar date downstream.
  startDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start date"),
  amount: z.number().positive("Amount must be positive").or(z.string().transform((val) => parseFloat(val))),
  
  // Payment
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().max(100).optional().or(z.literal("")),
  
  // Payment details
  packageDuration: z.string().max(50).optional().or(z.literal("")),
  isPersonalTrainer: z.boolean().optional(),
  friendsFamilyDiscount: z.boolean().optional(),
  monthlyRate: z.number().positive().optional().or(z.string().transform((val) => parseFloat(val)).optional()),
  studentOrGymfloPlan: z.boolean().optional(),
  /** @deprecated Use studentOrGymfloPlan; accepted for older clients */
  studentOrGymbroPlan: z.boolean().optional(),
  specialOccasion: z.string().max(100).optional().or(z.literal("")),
}).transform(({ studentOrGymbroPlan, studentOrGymfloPlan, ...rest }) => ({
  ...rest,
  studentOrGymfloPlan: studentOrGymfloPlan ?? studentOrGymbroPlan,
}));

export const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional().or(z.literal("")),
  // The UI sends "" when no gender is picked; treat that as "not provided".
  gender: z.nativeEnum(Gender).optional().or(z.literal("").transform(() => undefined)),
  // Accept "" (not provided) or a calendar date / ISO datetime (the date input sends "YYYY-MM-DD").
  dateOfBirth: z
    .union([
      z.literal(""),
      z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
    ])
    .optional(),
  address: z.string().max(500).optional().or(z.literal("")),
  emergencyContact: z.string().max(100).optional().or(z.literal("")),
  status: z.nativeEnum(MemberStatus).optional(),
});

export const memberQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  sortBy: z.enum(["joinDate_asc", "joinDate_desc", "name_asc", "name_desc"]).optional(),
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive().max(100)).optional(),
  cursor: z.string().cuid().optional(),
});

// ============ PAYMENT VALIDATORS ============

export const createPaymentSchema = z.object({
  memberId: z.string().cuid("Invalid member ID"),
  amount: z.number().positive("Amount must be positive").or(z.string().transform((val) => parseFloat(val))),
  method: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(PaymentStatus).optional(),
  reference: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  
  // Payment details
  packageDuration: z.string().max(50).optional().or(z.literal("")),
  isPersonalTrainer: z.boolean().optional(),
  friendsFamilyDiscount: z.boolean().optional(),
  monthlyRate: z.number().positive().optional().or(z.string().transform((val) => parseFloat(val)).optional()),
  studentGymfloPlan: z.boolean().optional(),
  /** @deprecated Use studentGymfloPlan */
  studentGymbroPlan: z.boolean().optional(),
  specialOccasion: z.string().max(100).optional().or(z.literal("")),
  
  receivedAt: z.string().datetime().optional(),
}).transform(({ studentGymbroPlan, studentGymfloPlan, ...rest }) => ({
  ...rest,
  studentGymfloPlan: studentGymfloPlan ?? studentGymbroPlan,
}));

export const paymentQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  memberId: z.string().cuid().optional(),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive().max(500)).optional(),
  cursor: z.string().cuid().optional(),
});

// ============ ATTENDANCE VALIDATORS ============

export const createAttendanceSchema = z.object({
  memberId: z.string().cuid("Invalid member ID"),
  method: z.nativeEnum(AttendanceMethod).default("MANUAL"),
});

export const attendanceQuerySchema = z.object({
  memberId: z.string().cuid().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============ WALK-IN VISIT (FREE TRIAL / DAY PASS) ============

export const createWalkInVisitSchema = z
  .object({
    kind: z.nativeEnum(WalkInVisitKind),
    name: z.string().min(1, "Name is required").max(100),
    phone: z.string().min(10, "Phone is required").max(15),
    visitDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
    amount: z
      .number()
      .positive("Amount must be positive")
      .max(50000)
      .optional()
      .nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === WalkInVisitKind.DAY_PASS) {
      if (data.amount == null || Number.isNaN(data.amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Day pass amount is required",
          path: ["amount"],
        });
      }
    }
    if (data.kind === WalkInVisitKind.FREE_TRIAL && data.amount != null && data.amount > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Free trial cannot include an amount",
        path: ["amount"],
      });
    }
  });

export const walkInVisitQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  phone: z.string().min(10).max(15).optional(),
});

// ============ USER VALIDATORS ============

export const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["ADMIN", "SUB_ADMIN"]),
  
  // Permissions (for SUB_ADMIN)
  canViewMembers: z.boolean().optional(),
  canEditMembers: z.boolean().optional(),
  canViewPayments: z.boolean().optional(),
  canEditPayments: z.boolean().optional(),
  canViewRenewals: z.boolean().optional(),
  canEditRenewals: z.boolean().optional(),
  canViewReminders: z.boolean().optional(),
  canEditReminders: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  
  // Trainer fields
  isTrainer: z.boolean().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

// ============ HELPER: Validate and parse ============

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: URLSearchParams): T {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return schema.parse(obj);
}
