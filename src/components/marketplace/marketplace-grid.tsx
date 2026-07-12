"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceApp } from "@/data/marketplace/catalog";
import { ExternalLink, Loader2 } from "lucide-react";

interface InstalledRow {
  slug: string;
  installed: boolean;
  configurePath: string;
}

interface MarketplaceGridProps {
  showEcosystem?: boolean;
  onInstallChange?: () => void;
}

export function MarketplaceGrid({ showEcosystem = true, onInstallChange }: MarketplaceGridProps) {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [installed, setInstalled] = useState<InstalledRow[]>([]);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace");
      const json = await res.json();
      if (json.success) {
        setApps(json.data.apps);
        setInstalled(json.data.installed);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (slug: string, enabled: boolean) => {
    setBusySlug(slug);
    try {
      await fetch(`/api/marketplace/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await load();
      onInstallChange?.();
    } finally {
      setBusySlug(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const flagship = apps.filter((a) => a.featured);
  const ecosystem = showEcosystem ? apps.filter((a) => !a.featured) : [];

  const renderCard = (app: MarketplaceApp) => {
    const row = installed.find((i) => i.slug === app.slug);
    const isInstalled = row?.installed ?? false;
    const isBusy = busySlug === app.slug;

    return (
      <Card key={app.slug} className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <span className="text-2xl" aria-hidden>
              {app.icon}
            </span>
            <Badge variant={app.status === "available" ? "default" : "secondary"}>
              {app.status === "available" ? "Available" : app.status === "beta" ? "Beta" : "Soon"}
            </Badge>
          </div>
          <CardTitle className="text-lg">{app.name}</CardTitle>
          <CardDescription>{app.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto space-y-3">
          <p className="text-sm text-muted-foreground">{app.description}</p>
          {app.envKeys?.length ? (
            <p className="text-xs text-muted-foreground">Env: {app.envKeys.join(", ")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isInstalled ? "outline" : "default"}
              disabled={isBusy || app.status === "coming_soon"}
              onClick={() => toggle(app.slug, !isInstalled)}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : isInstalled ? "Uninstall" : "Install"}
            </Button>
            {isInstalled && (
              <Button size="sm" variant="secondary" asChild>
                <Link href={app.configurePath}>
                  Configure
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
            {app.memberPath && isInstalled && (
              <Button size="sm" variant="ghost" asChild>
                <Link href={app.memberPath} target="_blank" rel="noreferrer">
                  Open member view
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{flagship.map(renderCard)}</div>
      {ecosystem.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            More apps
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ecosystem.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
