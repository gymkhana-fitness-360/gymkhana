"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface RefreshButtonProps {
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

export function RefreshButton({ onRefresh, className = "" }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      router.refresh();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`inline-flex items-center gap-2 bg-muted text-foreground px-4 py-2.5 rounded-xl hover:bg-muted/80 transition-all duration-200 font-semibold active:scale-[0.98] disabled:opacity-50 ${className}`}
      title="Refresh"
    >
      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  );
}
