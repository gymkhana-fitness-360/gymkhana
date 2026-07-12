"use client";

import { useCallback, useRef, useState } from "react";

type QueuedAction = () => Promise<void>;

export function useActionQueue() {
  const tailRef = useRef<Promise<void>>(Promise.resolve());
  const queuedKeysRef = useRef(new Set<string>());
  const [queuedKeys, setQueuedKeys] = useState<string[]>([]);

  const syncQueuedKeys = useCallback(() => {
    setQueuedKeys(Array.from(queuedKeysRef.current));
  }, []);

  const isQueued = useCallback((key: string) => {
    return queuedKeysRef.current.has(key);
  }, []);

  const enqueueAction = useCallback(
    (key: string, action: QueuedAction): boolean => {
      if (queuedKeysRef.current.has(key)) return false;

      queuedKeysRef.current.add(key);
      syncQueuedKeys();

      tailRef.current = tailRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await action();
          } finally {
            queuedKeysRef.current.delete(key);
            syncQueuedKeys();
          }
        });

      return true;
    },
    [syncQueuedKeys]
  );

  return {
    enqueueAction,
    isQueued,
    hasQueuedActions: queuedKeys.length > 0,
  };
}
