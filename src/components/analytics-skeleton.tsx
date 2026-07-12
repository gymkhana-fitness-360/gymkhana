/**
 * Loading Skeleton for Analytics Page
 * Matches the actual layout for better perceived performance
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-shimmer rounded" />
          <div className="h-4 w-64 bg-muted animate-shimmer rounded" />
        </div>
        <div className="h-10 w-24 bg-muted animate-shimmer rounded" />
      </div>

      {/* Date Range Controls Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-9 w-32 bg-muted animate-shimmer rounded" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metric Toggles Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-28 bg-muted animate-shimmer rounded" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-shimmer rounded" />
              <div className="h-4 w-4 bg-muted animate-shimmer rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-shimmer rounded mb-2" />
              <div className="h-3 w-40 bg-muted animate-shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-48 bg-muted animate-shimmer rounded mb-2" />
              <div className="h-4 w-64 bg-muted animate-shimmer rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-muted animate-shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Large Chart Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-56 bg-muted animate-shimmer rounded mb-2" />
          <div className="h-4 w-72 bg-muted animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full bg-muted animate-shimmer rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
