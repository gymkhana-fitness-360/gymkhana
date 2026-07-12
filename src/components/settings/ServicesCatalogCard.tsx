"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  Plan: { id: string; name: string }[];
}

export function ServicesCatalogCard() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createService = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setName("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services catalog</CardTitle>
        <CardDescription>Group plans under services for clearer plan organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="serviceName">New service</Label>
            <Input
              id="serviceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gym membership"
              className="mt-1"
            />
          </div>
          <Button className="self-end" onClick={createService} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {services.map((s) => (
              <li key={s.id} className="px-4 py-3 flex justify-between gap-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.Plan.length} plan{s.Plan.length === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
