/** Gym-owner MCP connect payloads (Cursor / Claude) — no raw JSON required in UI. */

export const DEFAULT_MCP_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function resolveMcpTokenTtlSeconds(): number {
  const raw = process.env.FITNESS360_MCP_TOKEN_TTL_SECONDS?.trim();
  const n = raw ? parseInt(raw, 10) : DEFAULT_MCP_TOKEN_TTL_SECONDS;
  if (Number.isNaN(n) || n < 300) return DEFAULT_MCP_TOKEN_TTL_SECONDS;
  return Math.min(n, 30 * 24 * 60 * 60);
}

export function buildRemoteMcpServerBlock(appUrl: string, accessToken: string) {
  const base = appUrl.replace(/\/$/, "");
  return {
    url: `${base}/api/mcp`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export function buildCursorMcpConfig(appUrl: string, accessToken: string) {
  return {
    mcpServers: {
      fitness360: buildRemoteMcpServerBlock(appUrl, accessToken),
    },
  };
}

/** Claude Desktop merges into claude_desktop_config.json → mcpServers */
export function buildClaudeMcpConfig(appUrl: string, accessToken: string) {
  return buildCursorMcpConfig(appUrl, accessToken);
}

export type McpConnectPayload = {
  accessToken: string;
  expiresIn: number;
  expiresAt: string;
  mcpUrl: string;
  settingsUrl: string;
  qrImageUrl: string;
  cursor: {
    downloadFileName: string;
    config: Record<string, unknown>;
    steps: string[];
  };
  claude: {
    downloadFileName: string;
    config: Record<string, unknown>;
    configPathMac: string;
    configPathWin: string;
    steps: string[];
  };
  mailtoShare: string;
};

export function buildMcpConnectPayload(
  appUrl: string,
  accessToken: string,
  expiresIn: number,
  settingsPath = "/dashboard/settings?tab=agent",
): McpConnectPayload {
  const base = appUrl.replace(/\/$/, "");
  const settingsUrl = `${base}${settingsPath}`;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const cursorConfig = buildCursorMcpConfig(base, accessToken);
  const claudeConfig = buildClaudeMcpConfig(base, accessToken);

  const mailtoSubject = encodeURIComponent("Fitness360 AI assistant setup");
  const mailtoBody = encodeURIComponent(
    `Open this link while logged in as gym admin to connect Cursor or Claude to our gym data:\n\n${settingsUrl}\n\nThen follow the on-screen steps (Test connection → Download config).`,
  );

  return {
    accessToken,
    expiresIn,
    expiresAt,
    mcpUrl: `${base}/api/mcp`,
    settingsUrl,
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(settingsUrl)}`,
    cursor: {
      downloadFileName: "fitness360-cursor-mcp.json",
      config: cursorConfig,
      steps: [
        "Download the Fitness360 config file (button below).",
        "Open Cursor → Settings → MCP → Add new server.",
        'Choose "Import from JSON" or paste the file contents into your MCP config.',
        "Enable the fitness360 server and click Restart.",
        "Return here and press Test connection — no need to copy tokens by hand.",
      ],
    },
    claude: {
      downloadFileName: "fitness360-claude-mcp.json",
      config: claudeConfig,
      configPathMac: "~/Library/Application Support/Claude/claude_desktop_config.json",
      configPathWin: "%APPDATA%\\Claude\\claude_desktop_config.json",
      steps: [
        "Download the Fitness360 config file (button below).",
        "Open Claude Desktop → Settings → Developer → Edit Config.",
        "Merge the mcpServers.fitness360 block from the file into claude_desktop_config.json.",
        "Restart Claude Desktop completely.",
        "Return here and press Test connection.",
      ],
    },
    mailtoShare: `mailto:?subject=${mailtoSubject}&body=${mailtoBody}`,
  };
}
