#!/usr/bin/env npx tsx
/**
 * Fitness360 MCP server (OS-8) — exposes agent tools via Model Context Protocol.
 *
 * Env:
 *   FITNESS360_API_URL — e.g. https://your-app.vercel.app
 *   FITNESS360_AGENT_TOKEN — OAuth Bearer token with gym scope
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FITNESS360_MCP_TOOL_NAMES } from "../src/lib/mcp/fitness360-mcp";

const BASE = process.env.FITNESS360_API_URL?.replace(/\/$/, "");
const TOKEN = process.env.FITNESS360_AGENT_TOKEN;

function assertConfigured() {
  if (BASE && TOKEN) return;
  const msg =
    "Fitness360 MCP: set FITNESS360_API_URL and FITNESS360_AGENT_TOKEN in .env.mcp.local, then run npm run mcp:setup (dev server must be running).";
  console.error(msg);
  throw new Error(msg);
}

const MCP_TOOLS = [...FITNESS360_MCP_TOOL_NAMES];

async function callFitness360Tool(name: string, args: Record<string, unknown>) {
  if (!BASE || !TOKEN) {
    throw new Error("Set FITNESS360_API_URL and FITNESS360_AGENT_TOKEN");
  }
  const res = await fetch(`${BASE}/api/agent/v1/tools/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args ?? {}),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json;
}

const server = new Server(
  { name: "fitness360", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: MCP_TOOLS.map((name) => ({
    name,
    description: `Fitness360 agent tool: ${name}`,
    inputSchema: { type: "object", additionalProperties: true },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const result = await callFitness360Tool(name, args);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

async function main() {
  assertConfigured();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
