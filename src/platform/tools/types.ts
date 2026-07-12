import type { z } from "zod";
import type { AgentScope } from "@/lib/rbac/agent-scopes";

export type ToolContext = {
  gymId: string;
  accountId?: string;
  userId?: string;
  agentClientId?: string;
  correlationId: string;
};

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  agentScopes: AgentScope[];
  audit: "always" | "mutations" | "none";
  handler: (ctx: ToolContext, input: TInput) => Promise<TOutput>;
};
