"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

const logger = createLogger("dashboard-error.tsx");

export default function DashboardError({
  error,
  reset,
}: {
  error: (Error & { digest?: string }) | unknown;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error("Dashboard error:", error as Error);
  }, [error]);

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-card rounded-2xl shadow-lg border border-red-200 p-8 sm:p-12">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-5">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 text-center">
          Dashboard Error
        </h2>
        
        <p className="text-muted-foreground text-center mb-2">
          We couldn&apos;t load this page. This might be a temporary issue.
        </p>
        
        <div className="mb-6 mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 dark:bg-destructive/15">
          <p className="break-words font-mono text-sm text-destructive">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
          >
            <RefreshCw className="h-5 w-5" />
            Reload Page
          </Button>
          
          <Button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 bg-muted text-foreground px-6 py-3 rounded-xl hover:bg-muted/80 transition-colors font-semibold"
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </Button>
        </div>
        
        {error instanceof Error &&
        "digest" in error &&
        typeof (error as Error & { digest?: string }).digest === "string" ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Error ID: {(error as Error & { digest?: string }).digest}
          </p>
        ) : null}

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            {error instanceof Error &&
            "digest" in error &&
            typeof (error as Error & { digest?: string }).digest === "string"
              ? "If this keeps happening, contact support and share the error ID above."
              : "If this keeps happening, contact support and describe what you were doing when it failed."}
          </p>
        </div>
      </div>
    </div>
  );
}
