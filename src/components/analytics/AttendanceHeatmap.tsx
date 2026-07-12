"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to load heatmap");
  return r.json();
});

type HeatmapData = {
  period: { startDate: string; endDate: string; days: number };
  cells: { dayOfWeek: number; dayLabel: string; hour: number; count: number }[];
  peak: { dayLabel: string; hour: number; count: number } | null;
  quiet: { dayLabel: string; hour: number; count: number } | null;
  totalCheckIns: number;
};

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cellColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/40";
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.75) return "bg-primary";
  if (ratio > 0.5) return "bg-primary/70";
  if (ratio > 0.25) return "bg-primary/40";
  return "bg-primary/20";
}

export function AttendanceHeatmap() {
  const { data, isLoading, error } = useSWR<HeatmapData>(
    "/api/analytics/attendance-heatmap?days=28",
    fetcher,
  );

  const max = data?.cells.reduce((m, c) => Math.max(m, c.count), 0) ?? 0;
  const lookup = new Map(
    (data?.cells ?? []).map((c) => [`${c.dayOfWeek}-${c.hour}`, c.count]),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Attendance heatmap (IST)</CardTitle>
        {data?.period && (
          <p className="text-xs text-muted-foreground">
            {data.period.startDate} → {data.period.endDate} · {data.totalCheckIns} check-ins
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive">Could not load heatmap.</p>
        )}
        {data && (
          <>
            <div className="overflow-x-auto space-y-0.5">
              <div className="flex gap-0.5 pl-12">
                {HOURS.map((h) => (
                  <div key={h} className="w-5 sm:w-6 text-[10px] text-center text-muted-foreground shrink-0">
                    {h}
                  </div>
                ))}
              </div>
              {DAYS.map((dayLabel, dow) => (
                <div key={dayLabel} className="flex gap-0.5 items-center">
                  <div className="w-10 text-xs font-medium text-right shrink-0">{dayLabel}</div>
                  {HOURS.map((hour) => {
                    const count = lookup.get(`${dow}-${hour}`) ?? 0;
                    return (
                      <div
                        key={`${dow}-${hour}`}
                        title={`${dayLabel} ${hour}:00 — ${count}`}
                        className={`h-5 w-5 sm:h-6 sm:w-6 rounded-sm shrink-0 ${cellColor(count, max)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {data.peak && (
                <span>
                  Peak: <strong className="text-foreground">{data.peak.dayLabel} {data.peak.hour}:00</strong> ({data.peak.count})
                </span>
              )}
              {data.quiet && (
                <span>
                  Quiet: <strong className="text-foreground">{data.quiet.dayLabel} {data.quiet.hour}:00</strong> ({data.quiet.count})
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
