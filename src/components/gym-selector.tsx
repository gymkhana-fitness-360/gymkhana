"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";

export type GymOption = { id: string; name: string; address: string | null };

export function GymSelector({
  initialGyms,
  initialGymId,
}: {
  initialGyms: GymOption[];
  initialGymId: string | null;
}) {
  const router = useRouter();
  const [gyms, setGyms] = React.useState(initialGyms);
  const [value, setValue] = React.useState(initialGymId ?? "");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/gyms");
        if (!res.ok) return;
        const data = (await res.json()) as { gyms?: GymOption[] };
        if (!cancelled && Array.isArray(data.gyms)) {
          setGyms(data.gyms);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setValue(initialGymId ?? "");
  }, [initialGymId]);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setValue(next);
    if (!next) return;
    try {
      const res = await fetch("/api/gym-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId: next }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      /* ignore */
    }
  };

  if (gyms.length === 0) {
    return null;
  }

  const selectId = "gym-location-select";

  return (
    <div className="hidden min-w-0 max-w-[11rem] flex-col gap-1 sm:flex md:max-w-[14rem]">
      <Label htmlFor={selectId} className="sr-only">
        Active gym location
      </Label>
      <SelectNative
        id={selectId}
        value={value || gyms[0]?.id || ""}
        onChange={onChange}
        aria-label="Active gym location"
      >
        {gyms.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </SelectNative>
    </div>
  );
}
