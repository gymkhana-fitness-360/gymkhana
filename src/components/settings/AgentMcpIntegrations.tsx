"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AgentClientRow = {
  clientId: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
};

type ConnectPayload = {
  expiresAt: string;
  expiresIn: number;
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

const STORAGE_KEY = "fitness360_selected_agent_client";

function downloadJsonFile(filename: string, data: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatExpiry(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AgentMcpIntegrations() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AgentClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [connect, setConnect] = useState<ConnectPayload | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [newName, setNewName] = useState("My AI assistant");
  const [readOnly, setReadOnly] = useState(true);
  const [creating, setCreating] = useState(false);
  const [clientSecretOnce, setClientSecretOnce] = useState<string | null>(null);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [assistantTab, setAssistantTab] = useState<"cursor" | "claude">("cursor");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/settings/agent-clients");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    const list: AgentClientRow[] = data.clients ?? [];
    setClients(list);
    setLoading(false);

    const stored = localStorage.getItem(STORAGE_KEY);
    const active = list.filter((c) => c.isActive);
    const pick =
      (stored && active.some((c) => c.clientId === stored) ? stored : null) ??
      active[0]?.clientId ??
      null;
    setSelectedClientId(pick);
  }, []);

  const refreshConnect = useCallback(async (clientId: string) => {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/agent-clients/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not refresh connection");
        setConnect(null);
        return;
      }
      setConnect(data.connect);
      localStorage.setItem(STORAGE_KEY, clientId);
    } finally {
      setConnectLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedClientId) {
      setConnect(null);
      return;
    }
    refreshConnect(selectedClientId);
  }, [selectedClientId, refreshConnect]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    setClientSecretOnce(null);
    setTestStatus("idle");
    try {
      const res = await fetch("/api/settings/agent-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || "AI assistant",
          readOnly,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create");
        return;
      }
      setClientSecretOnce(data.clientSecret);
      setSelectedClientId(data.clientId);
      setConnect(data.connect);
      localStorage.setItem(STORAGE_KEY, data.clientId);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleTest = async () => {
    if (!selectedClientId) return;
    setBusyClientId(selectedClientId);
    setTestStatus("idle");
    setTestMessage(null);
    try {
      const res = await fetch("/api/settings/agent-clients/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestStatus("fail");
        setTestMessage(data.error ?? "Test failed");
        return;
      }
      setTestStatus("ok");
      setTestMessage(data.message);
    } finally {
      setBusyClientId(null);
    }
  };

  const handleUpdateAssistant = async () => {
    if (!selectedClientId || !connect) return;
    await refreshConnect(selectedClientId);
    const cfg =
      assistantTab === "cursor" ? connect.cursor : connect.claude;
    downloadJsonFile(cfg.downloadFileName, cfg.config);
  };

  const handleRevoke = async (clientId: string) => {
    if (!confirm("Revoke this assistant connection?")) return;
    setBusyClientId(clientId);
    try {
      const res = await fetch(`/api/settings/agent-clients/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to revoke");
        return;
      }
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
        setConnect(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      await load();
    } finally {
      setBusyClientId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedClient = clients.find((c) => c.clientId === selectedClientId);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Step 1 — Enable AI assistant
          </CardTitle>
          <CardDescription>
            One setup per gym. We handle tokens — you do not paste secrets into Cursor by hand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clients.length === 0 ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="agent-name">Name</Label>
                  <Input
                    id="agent-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating} size="lg">
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Enable assistant
                </Button>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <CheckboxInput
                  checked={readOnly}
                  onChange={(e) => setReadOnly(e.target.checked)}
                />
                Read-only (recommended) — view members & renewals, no WhatsApp sends
              </label>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Assistant enabled. Select an integration below or create another from the list.
            </p>
          )}

          {clientSecretOnce ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium">Optional — for Zapier / scripts only</p>
              <p className="mt-1 font-mono text-xs break-all">
                client_secret: {clientSecretOnce}
              </p>
              <p className="mt-2 text-muted-foreground">
                Cursor and Claude users can skip this — use Download config in Step 2.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {clients.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Connect Cursor or Claude</CardTitle>
            <CardDescription>
              Download one file, restart your assistant, then press Test connection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y rounded-lg border">
              {clients.map((c) => (
                <li key={c.clientId}>
                  <button
                    type="button"
                    onClick={() => c.isActive && setSelectedClientId(c.clientId)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      selectedClientId === c.clientId
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    } ${!c.isActive ? "opacity-50" : ""}`}
                    disabled={!c.isActive}
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.scopes.includes("write:reminders") ? "Read + write" : "Read-only"}
                      </p>
                    </div>
                    {selectedClientId === c.clientId ? (
                      <span className="text-xs font-medium text-primary">Selected</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            {selectedClient && connect ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {connectLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>
                    Config auto-updates until {formatExpiry(connect.expiresAt)} — press
                    &quot;Update assistant config&quot; to download a fresh file (no manual token edit).
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="lg"
                    onClick={handleTest}
                    disabled={busyClientId === selectedClientId || connectLoading}
                  >
                    {busyClientId === selectedClientId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Test connection
                  </Button>
                  <Button
                    size="lg"
                    variant="default"
                    onClick={handleUpdateAssistant}
                    disabled={connectLoading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Update assistant config
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={connect.mailtoShare}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email staff link
                    </a>
                  </Button>
                </div>

                {testStatus === "ok" ? (
                  <div className="flex items-start gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{testMessage}</span>
                  </div>
                ) : null}
                {testStatus === "fail" ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{testMessage}</span>
                  </div>
                ) : null}

                <Tabs
                  value={assistantTab}
                  onValueChange={(v) => setAssistantTab(v as "cursor" | "claude")}
                >
                  <TabsList>
                    <TabsTrigger value="cursor">Cursor</TabsTrigger>
                    <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cursor" className="space-y-3 pt-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                      {connect.cursor.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadJsonFile(
                          connect.cursor.downloadFileName,
                          connect.cursor.config,
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Cursor config
                    </Button>
                  </TabsContent>
                  <TabsContent value="claude" className="space-y-3 pt-3">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                      {connect.claude.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <p className="text-xs text-muted-foreground font-mono">
                      Mac: {connect.claude.configPathMac}
                      <br />
                      Win: {connect.claude.configPathWin}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadJsonFile(
                          connect.claude.downloadFileName,
                          connect.claude.config,
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Claude config
                    </Button>
                  </TabsContent>
                </Tabs>

                <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-medium">Staff QR — open this page on phone</p>
                    <p className="mt-1 text-xs text-muted-foreground break-all">
                      {connect.settingsUrl}
                    </p>
                    <Button variant="link" className="h-auto px-0 text-xs" asChild>
                      <a href={connect.settingsUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Open setup page
                      </a>
                    </Button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={connect.qrImageUrl}
                    alt="QR code to Fitness360 AI setup"
                    width={220}
                    height={220}
                    className="rounded-md border bg-white"
                  />
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Advanced (developers)
                </button>
                {showAdvanced ? (
                  <pre className="max-h-40 overflow-auto rounded bg-background p-3 text-xs">
                    {JSON.stringify(
                      assistantTab === "cursor"
                        ? connect.cursor.config
                        : connect.claude.config,
                      null,
                      2,
                    )}
                  </pre>
                ) : null}
              </>
            ) : connectLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {clients
                .filter((c) => c.isActive)
                .map((c) => (
                  <Button
                    key={c.clientId}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={busyClientId === c.clientId}
                    onClick={() => handleRevoke(c.clientId)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Revoke {c.name}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
