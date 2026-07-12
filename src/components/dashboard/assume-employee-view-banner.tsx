"use client";

import { useSession } from "next-auth/react";
import { useAssumeEmployeeView, exitAssumeEmployeeView } from "@/hooks/use-assume-employee-view";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function AssumeEmployeeViewBanner() {
  const { data: session } = useSession();
  const assume = useAssumeEmployeeView();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin || !assume) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <span className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        Employee preview — sidebar shows staff-limited navigation.
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-amber-600/50"
        onClick={() => exitAssumeEmployeeView(router)}
      >
        Exit preview
      </Button>
    </div>
  );
}
