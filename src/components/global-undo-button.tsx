"use client";

import { useSession } from "next-auth/react";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalUndo } from "@/hooks/use-global-undo";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function GlobalUndoButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const signedIn = !!session?.user?.id;
  const { item, loading, restoring, restore } = useGlobalUndo(signedIn);
  const canUndo = signedIn && !!item && !loading && !restoring;

  const handleUndo = async () => {
    if (!item) return;
    if (
      !confirm(
        `${item.label}\n\nRestore deleted payment(s) and membership period(s) for ${item.memberName}?`,
      )
    ) {
      return;
    }
    const ok = await restore();
    if (ok) {
      toast.success(`Undone: restored data for ${item.memberName}`);
      router.push(`/dashboard/members/${encodeURIComponent(item.memberId)}`);
      router.refresh();
    } else {
      toast.error("Undo failed or expired");
    }
  };

  if (!signedIn) return null;

  const label = restoring ? "Restoring…" : loading ? "Undo…" : "Undo";
  const title = restoring
    ? "Restoring deleted payment and memberships…"
    : loading
      ? "Checking for undoable actions…"
      : item
        ? `Undo within 30 min — ${item.label}`
        : undefined;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={
        canUndo
          ? "gap-2 border-amber-500/70 bg-amber-50 font-medium text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950/70"
          : "gap-2 border-transparent bg-transparent text-muted-foreground opacity-50 shadow-none hover:bg-transparent hover:text-muted-foreground"
      }
      disabled={!canUndo}
      onClick={() => void handleUndo()}
      title={title}
      aria-label={canUndo && item ? `Undo: ${item.label}` : "Undo (unavailable)"}
    >
      {restoring || loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Undo2 className="h-4 w-4 shrink-0" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
