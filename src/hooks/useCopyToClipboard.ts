"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, []);

  return { copiedCode: copiedId, copyToClipboard };
}
