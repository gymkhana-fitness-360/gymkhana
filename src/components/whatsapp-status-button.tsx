"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WHATSAPP_BUSINESS_LABEL,
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";

export function WhatsAppStatusButton() {
  const [status, setStatus] = useState<"ok" | "error" | "unknown">("unknown");
  const [connecting, setConnecting] = useState(false);

  const isConnected = status === "ok";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/health");
      if (res.ok) {
        const result = await res.json();
        setStatus(result.status === "ok" ? "ok" : "error");
        if (result.status !== "ok") {
          alert(`${WHATSAPP_NOT_CONFIGURED}\n\n${WHATSAPP_SETUP_HINT}`);
        }
      } else {
        setStatus("error");
        alert(`${WHATSAPP_NOT_CONFIGURED}\n\n${WHATSAPP_SETUP_HINT}`);
      }
    } catch {
      setStatus("error");
      alert(`${WHATSAPP_NOT_CONFIGURED}\n\n${WHATSAPP_SETUP_HINT}`);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConnect}
      disabled={connecting}
      title={
        isConnected
          ? `${WHATSAPP_BUSINESS_LABEL} API connected`
          : status === "error"
          ? `${WHATSAPP_BUSINESS_LABEL} API not configured`
          : `Check ${WHATSAPP_BUSINESS_LABEL} API status`
      }
      className={cn(
        "gap-2 text-xs",
        isConnected && "border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/10"
      )}
    >
      {connecting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <MessageCircle className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">
        {isConnected ? WHATSAPP_BUSINESS_LABEL : `${WHATSAPP_BUSINESS_LABEL} (setup)`}
      </span>
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isConnected ? "bg-green-500" : "bg-muted-foreground/30"
        )}
      />
    </Button>
  );
}
