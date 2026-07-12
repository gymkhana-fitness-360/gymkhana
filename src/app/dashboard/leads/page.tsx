"use client";

import { useState } from "react";
import useSWR from "swr";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SelectNative,
} from "@/components/ui/select-native";
import { Loader2, Plus, CalendarCheck, UserCheck } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  notes: string | null;
  followUpAt: string | null;
  convertedMemberId: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-700",
  CONTACTED: "bg-amber-500/10 text-amber-700",
  TRIAL_SCHEDULED: "bg-purple-500/10 text-purple-700",
  TRIAL_DONE: "bg-indigo-500/10 text-indigo-700",
  CONVERTED: "bg-green-500/10 text-green-700",
  LOST: "bg-muted text-muted-foreground",
};

export default function LeadsPage() {
  const { data, isLoading, mutate } = useSWR<{ leads: LeadRow[] }>(
    "/api/leads",
    fetcher,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("WEBSITE");
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const createLead = async () => {
    if (!name.trim() || phone.length < 10) return;
    setSaving(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source }),
      });
      setName("");
      setPhone("");
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const patchLead = async (
    id: string,
    body: Record<string, unknown>,
  ) => {
    setActingId(id);
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await mutate();
    } finally {
      setActingId(null);
    }
  };

  const bookTrial = async (id: string) => {
    setActingId(id);
    try {
      await fetch(`/api/leads/${id}/book-trial`, { method: "POST" });
      await mutate();
    } finally {
      setActingId(null);
    }
  };

  const leads = data?.leads ?? [];
  const open = leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Leads & enquiries"
        description="Capture, follow up, and convert prospects to trials and members"
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add lead</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full sm:w-40"
          />
          <SelectNative
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full sm:w-36"
          >
            <option value="WEBSITE">Website</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="WALK_IN">Walk-in</option>
            <option value="REFERRAL">Referral</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="PHONE_CALL">Phone</option>
            <option value="OTHER">Other</option>
          </SelectNative>
          <Button onClick={createLead} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </CardContent>
        <p className="px-6 pb-4 text-xs text-muted-foreground">
          Public embed: POST <code className="text-[11px]">/api/leads/inbound</code> with{" "}
          <code className="text-[11px]">gymId</code>, name, phone
        </p>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">
            Pipeline ({open.length} open)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}
          <ul className="space-y-2">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{lead.name}</span>
                    <Badge className={STATUS_COLORS[lead.status] ?? ""}>
                      {lead.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{lead.source}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                  {lead.followUpAt && (
                    <p className="text-xs text-amber-600">
                      Follow up: {new Date(lead.followUpAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {lead.status === "NEW" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId === lead.id}
                      onClick={() => patchLead(lead.id, { status: "CONTACTED" })}
                    >
                      Contacted
                    </Button>
                  )}
                  {!["TRIAL_SCHEDULED", "CONVERTED"].includes(lead.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId === lead.id}
                      onClick={() => bookTrial(lead.id)}
                    >
                      {actingId === lead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CalendarCheck className="h-3 w-3 mr-1" />
                          Book trial
                        </>
                      )}
                    </Button>
                  )}
                  {!["CONVERTED", "LOST"].includes(lead.status) && !lead.convertedMemberId && (
                    <Link
                      href={`/dashboard/members/new?leadId=${lead.id}&name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone)}`}
                    >
                      <Button size="sm" variant="default">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Convert to member
                      </Button>
                    </Link>
                  )}
                  {lead.convertedMemberId && (
                    <Link href={`/dashboard/members/${lead.convertedMemberId}`}>
                      <Button size="sm" variant="ghost">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Member
                      </Button>
                    </Link>
                  )}
                  {!["CONVERTED", "LOST"].includes(lead.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actingId === lead.id}
                      onClick={() =>
                        patchLead(lead.id, {
                          status: "LOST",
                          lostReason: "Not interested",
                        })
                      }
                    >
                      Lost
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!isLoading && leads.length === 0 && (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
