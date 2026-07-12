import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  variant = "default",
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "border-border bg-card",
    success:
      "border-green-600/25 bg-green-500/[0.07] dark:border-emerald-500/40 dark:bg-emerald-500/10",
    warning:
      "border-amber-600/30 bg-amber-500/[0.08] dark:border-amber-500/35 dark:bg-amber-500/10",
    danger:
      "border-red-600/25 bg-red-500/[0.07] dark:border-red-500/40 dark:bg-red-500/10",
  };

  return (
    <Card
      className={`min-w-0 shadow-sm ring-1 ring-border dark:ring-border ${variantStyles[variant]}`}
    >
      <CardContent className="pt-6">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="break-words text-2xl font-bold leading-tight tracking-tight">
              {value}
            </p>
            {trend !== undefined && trendLabel && (
              <p
                className={`text-xs flex items-center gap-1 ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                <span>{trend >= 0 ? "↑" : "↓"}</span>
                <span>{Math.abs(trend)}</span>
                <span className="text-muted-foreground">{trendLabel}</span>
              </p>
            )}
          </div>
          <div className="shrink-0 rounded-lg bg-primary/12 p-3 dark:bg-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
