"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RefreshableRupee() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Refresh the page data
    router.refresh();
    // Small delay to show the refresh animation
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="relative group">
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
        title="Refresh dashboard data"
      >
        <span className="text-4xl font-bold text-white relative z-10">₹</span>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <RefreshCw
            className={`h-6 w-6 text-white ${isRefreshing ? "animate-spin" : ""}`}
          />
        </div>
      </Button>
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-2xl">
          <RefreshCw className="h-6 w-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
