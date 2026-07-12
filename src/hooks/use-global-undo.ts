"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GlobalUndoItem = {
  auditLogId: string;
  type: "payment_delete";
  label: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  expiresAt: string;
  deletedPaymentsCount: number;
  deletedMembershipsCount: number;
};

export function useGlobalUndo(enabled: boolean) {
  const [item, setItem] = useState<GlobalUndoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItem(null);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/undo", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success && json.data?.available && json.data.item) {
        setItem(json.data.item as GlobalUndoItem);
      } else {
        setItem(null);
      }
    } catch {
      setItem(null);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 500);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onUpdate = () => void refresh();
    window.addEventListener("undo-stack-updated", onUpdate);
    window.addEventListener("payment-updated", onUpdate);
    window.addEventListener("member-updated", onUpdate);
    return () => {
      window.removeEventListener("undo-stack-updated", onUpdate);
      window.removeEventListener("payment-updated", onUpdate);
      window.removeEventListener("member-updated", onUpdate);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!item?.expiresAt) return;
    const expiresMs = Date.parse(item.expiresAt);
    if (Number.isNaN(expiresMs)) return;
    const delay = expiresMs - Date.now();
    if (delay <= 0) {
      setItem(null);
      return;
    }
    const timer = setTimeout(() => setItem(null), delay);
    return () => clearTimeout(timer);
  }, [item?.expiresAt, item?.auditLogId]);

  const restore = useCallback(async () => {
    if (!item) return false;
    setRestoring(true);
    try {
      const res = await fetch("/api/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: true, auditLogId: item.auditLogId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(typeof json.error === "string" ? json.error : "Undo failed");
      }
      setItem(null);
      window.dispatchEvent(new Event("payment-updated"));
      window.dispatchEvent(new Event("member-updated"));
      window.dispatchEvent(new Event("membership-updated"));
      window.dispatchEvent(new Event("undo-stack-updated"));
      return true;
    } finally {
      setRestoring(false);
    }
  }, [item]);

  return { item, loading, restoring, refresh, restore };
}
