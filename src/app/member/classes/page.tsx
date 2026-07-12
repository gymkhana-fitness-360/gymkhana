"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface GymClassRow {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  bookingsCount: number;
  capacity: number;
}

export default function MemberClassesPage() {
  const { translate } = useLocale();
  const [classes, setClasses] = useState<GymClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.success) setClasses(json.data.classes);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{translate("member.classes.title")}</h1>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming classes. Ask staff to publish a schedule.</p>
      ) : (
        <ul className="space-y-3">
          {classes.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date(c.startsAt))} · {c.bookingsCount}/{c.capacity} spots
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
