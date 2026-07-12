#!/usr/bin/env sh
# Loads .env.mcp.local + .env.local then starts the GymFlo stdio MCP server.
set -e
cd "$(dirname "$0")/.."
if [ -f .env.mcp.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.mcp.local
  set +a
fi
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi
exec npx tsx mcp-server/index.ts
