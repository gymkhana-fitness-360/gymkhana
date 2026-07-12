import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ensureToolRegistry,
  executeTool,
  listToolNames,
  ToolExecutionError,
} from "@/platform/tools/registry";

/** Tools exposed via MCP (stdio + hosted). */
export const FITNESS360_MCP_TOOL_NAMES = [
  "searchMembers",
  "getOverdues",
  "getRenewals",
  "listChaseCandidates",
  "getChasePlan",
  "listGymFacts",
  "getAttendanceHeatmap",
  "listLeads",
  "listLeadsDueForFollowUp",
  "sendReminder",
  "createCampaign",
  "draftEngagement",
] as const;

export type Fitness360McpContext = {
  gymId: string;
  clientId: string;
  scopes: string[];
};

export function createFitness360McpServer(ctx: Fitness360McpContext): McpServer {
  ensureToolRegistry();
  const registered = new Set(listToolNames());

  const mcp = new McpServer({ name: "fitness360", version: "1.0.0" });

  for (const name of FITNESS360_MCP_TOOL_NAMES) {
    if (!registered.has(name)) continue;

    mcp.registerTool(
      name,
      {
        description: `Fitness360 agent tool: ${name}`,
        inputSchema: z.record(z.string(), z.unknown()).optional(),
      },
      async (args) => {
        try {
          const result = await executeTool(name, args ?? {}, {
            gymId: ctx.gymId,
            agentScopes: ctx.scopes,
            userId: `agent:${ctx.clientId}`,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (e) {
          const message =
            e instanceof ToolExecutionError
              ? `${e.code}: ${e.message}`
              : e instanceof Error
                ? e.message
                : String(e);
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    );
  }

  return mcp;
}
