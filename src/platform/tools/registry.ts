import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { AgentScope } from "@/lib/rbac/agent-scopes";
import { agentHasScope } from "@/lib/rbac/agent-scopes";
import { logAction } from "@/lib/audit-logger";
import type { ToolContext, ToolDefinition } from "./types";
import { registerCoreTools } from "./tools-core";
import { registerExpansionTools } from "./tools-expansion";
import { registerOsTools } from "./tools-os";

const tools = new Map<string, ToolDefinition>();

export function registerTool<TInput, TOutput>(def: ToolDefinition<TInput, TOutput>) {
  tools.set(def.name, def as ToolDefinition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function listToolNames(): string[] {
  return [...tools.keys()].sort();
}

export type ExecuteToolOptions = {
  gymId: string;
  agentScopes?: string[];
  userId?: string;
  correlationId?: string;
};

export async function executeTool<TInput>(
  name: string,
  input: unknown,
  options: ExecuteToolOptions,
): Promise<unknown> {
  const def = tools.get(name);
  if (!def) {
    throw new ToolExecutionError("unknown_tool", `Unknown tool: ${name}`);
  }

  if (options.agentScopes?.length) {
    const ok = def.agentScopes.some((scope) => agentHasScope(options.agentScopes!, scope));
    if (!ok) {
      throw new ToolExecutionError("insufficient_scope", `Missing scope for ${name}`);
    }
  }

  const parsed = def.schema.safeParse(input);
  if (!parsed.success) {
    throw new ToolExecutionError("invalid_input", parsed.error.message);
  }

  const ctx: ToolContext = {
    gymId: options.gymId,
    userId: options.userId,
    correlationId: options.correlationId ?? randomUUID(),
  };

  const output = await def.handler(ctx, parsed.data);

  if (def.audit !== "none" && options.userId) {
    logAction(options.userId, "agent_tool_invoked", "Tool", name, {
      gymId: options.gymId,
      correlationId: ctx.correlationId,
    }).catch(() => {});
  }

  return output;
}

export class ToolExecutionError extends Error {
  constructor(
    public readonly code: "unknown_tool" | "insufficient_scope" | "invalid_input",
    message: string,
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

let bootstrapped = false;
export function ensureToolRegistry() {
  if (bootstrapped) return;
  registerCoreTools();
  registerExpansionTools();
  registerOsTools();
  bootstrapped = true;
}
