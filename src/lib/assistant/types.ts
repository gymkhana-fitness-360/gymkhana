import { z } from "zod";

const memberSchema = z.object({
  id: z.number(),
  name: z.string().max(120),
  plan: z.string().max(40),
  status: z.string().max(40),
  phone: z.string().max(40).optional(),
  email: z.string().max(120).optional(),
  expiry: z.string().max(40).optional(),
});

const paymentSchema = z.object({
  id: z.number(),
  member: z.string().max(120),
  amount: z.number(),
  type: z.string().max(60),
  method: z.string().max(40),
  date: z.string().max(60),
  status: z.string().max(20),
});

const statsSchema = z.object({
  activeMembers: z.number(),
  todayCheckins: z.number(),
  monthlyRevenue: z.number(),
  renewalsDue: z.number(),
  pendingPayments: z.number(),
  totalPayments: z.number().optional(),
  whatsappSent: z.number().optional(),
});

const taskSchema = z.object({
  id: z.number(),
  task: z.string().max(200),
  priority: z.string().max(20).optional(),
  done: z.boolean().optional(),
});

export const assistantContextSchema = z.object({
  stats: statsSchema,
  members: z.array(memberSchema).max(80),
  payments: z.array(paymentSchema).max(50),
  tasks: z.array(taskSchema).max(30).optional(),
});

export type AssistantContext = z.infer<typeof assistantContextSchema>;

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const requestBase = z.object({
  message: z.string().min(1).max(2000),
  messages: z.array(assistantMessageSchema).max(20).optional(),
  context: assistantContextSchema.optional(),
  /** @deprecated Use `context` */
  demoContext: assistantContextSchema.optional(),
});

export const assistantRequestSchema = requestBase
  .superRefine((body, ctx) => {
    if (!body.context && !body.demoContext) {
      ctx.addIssue({
        code: "custom",
        message: "context is required",
        path: ["context"],
      });
    }
  })
  .transform((body) => ({
    message: body.message,
    messages: body.messages,
    context: (body.context ?? body.demoContext)!,
  }));

export type AssistantRequestBody = z.infer<typeof assistantRequestSchema>;

export type AssistantReplyMode = "llm" | "rules";

export type AssistantChatResponse = {
  success: boolean;
  reply?: string;
  mode?: AssistantReplyMode;
  keySource?: "byok" | "server" | "none";
  hint?: string;
  error?: string;
  code?: string;
};
