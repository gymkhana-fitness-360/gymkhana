"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, RotateCcw, Save, Eye } from "lucide-react";
import type { LifecycleTemplateKey } from "@/domains/communications/lifecycle-templates";

interface TemplateRow {
  key: LifecycleTemplateKey;
  label: string;
  whenUsed: string;
  automated: boolean;
  body: string;
  defaultBody: string;
  isCustom: boolean;
}

const PLACEHOLDER_HINTS = [
  "{{name}}",
  "{{plan}}",
  "{{expiryDate}}",
  "{{daysLeft}}",
  "{{n}}",
  "{{daysWord}}",
  "{{checkInDate}}",
];

export function WhatsAppLifecycleTemplatesCard() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<LifecycleTemplateKey>("before_2_days");
  const [draftBody, setDraftBody] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.key === selectedKey),
    [templates, selectedKey],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/whatsapp-lifecycle-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected) setDraftBody(selected.body);
    setPreview(null);
  }, [selected]);

  const runPreview = async () => {
    if (!selectedKey || !draftBody.trim()) return;
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/whatsapp-lifecycle-templates?action=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selectedKey, body: draftBody }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreview(data.preview ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const saveTemplate = async () => {
    if (!selectedKey || !draftBody.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/whatsapp-lifecycle-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selectedKey, body: draftBody }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetTemplate = async (key?: LifecycleTemplateKey) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/whatsapp-lifecycle-templates?action=reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(key ? { key } : {}),
      });
      if (!res.ok) throw new Error("Reset failed");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading WhatsApp lifecycle templates…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          WhatsApp lifecycle message templates
        </CardTitle>
        <CardDescription>
          Edit renewal and win-back message texts used by daily automation and manual reminders.
          Changes apply to future messages only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr]">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Template</Label>
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {templates.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedKey(t.key)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedKey === t.key
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span className="block">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.automated ? "Daily automation" : "Manual / staff send"}
                    {t.isCustom ? " · Custom" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {selected && (
              <p className="text-sm text-muted-foreground">{selected.whenUsed}</p>
            )}

            <div>
              <Label htmlFor="template-body">Message text</Label>
              <textarea
                id="template-body"
                value={draftBody}
                onChange={(e) => {
                  setDraftBody(e.target.value);
                  setPreview(null);
                }}
                rows={10}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {PLACEHOLDER_HINTS.map((p) => (
                <code key={p} className="rounded bg-muted px-1.5 py-0.5">
                  {p}
                </code>
              ))}
            </div>

            {preview && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Sample preview</p>
                <pre className="whitespace-pre-wrap text-sm">{preview}</pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={runPreview} disabled={previewing}>
                {previewing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Preview
              </Button>
              <Button type="button" onClick={saveTemplate} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetTemplate(selectedKey)}
                disabled={saving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to default
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => resetTemplate()}
                disabled={saving}
                className="text-muted-foreground"
              >
                Reset all templates
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
