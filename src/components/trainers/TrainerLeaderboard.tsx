"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TrainerLeaderboard() {
  const { data, isLoading } = useSWR("/api/trainers/leaderboard?days=90", fetcher);
  const trainers = data?.trainers ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Trainer performance</CardTitle>
        <p className="text-xs text-muted-foreground">Last 90 days — clients, classes, commission base</p>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!isLoading && trainers.length === 0 && (
          <p className="text-sm text-muted-foreground">No trainer data yet.</p>
        )}
        <ul className="space-y-2">
          {trainers.slice(0, 6).map((t: {
            trainerId: string;
            trainerName: string;
            activeClients: number;
            classSessions: number;
            revenueInr: number;
            avgRevenuePerClient: number;
          }, i: number) => (
            <li
              key={t.trainerId}
              className="flex items-center justify-between gap-2 text-sm border rounded-md p-2"
            >
              <div>
                <span className="text-muted-foreground mr-2">#{i + 1}</span>
                <span className="font-medium">{t.trainerName}</span>
                <p className="text-xs text-muted-foreground">
                  {t.activeClients} clients · {t.classSessions} classes
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(t.revenueInr)}
                </p>
                <p className="text-xs text-muted-foreground">
                  avg {formatCurrency(t.avgRevenuePerClient)}/client
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
