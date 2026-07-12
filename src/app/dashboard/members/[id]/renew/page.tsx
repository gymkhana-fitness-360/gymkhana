"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PaymentMethod } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: string;
}

interface MemberSummary {
  id: string;
  name: string;
  phone: string;
  Membership: Array<{
    id: string;
    endDate: string;
    Plan: { id: string; name: string; price: string };
  }>;
}

export default function MemberRenewPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    planId: "",
    amount: "",
    paymentMethod: "UPI" as PaymentMethod,
    paymentDate: new Date().toISOString().split("T")[0],
    reference: "",
    packageDuration: "1 Month Renewal",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${memberId}`).then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
    ])
      .then(([memberRes, plansData]) => {
        const data = memberRes.data ?? memberRes;
        setMember(data);
        setPlans(plansData);
        const current = data.Membership?.[0];
        if (current) {
          setForm((f) => ({
            ...f,
            planId: current.Plan.id,
            amount: current.Plan.price,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setForm({
      ...form,
      planId,
      amount: plan ? plan.price : form.amount,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.planId || !form.amount) {
      toast.error("Plan and amount are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          planId: form.planId,
          amount: parseFloat(form.amount),
          paymentMethod: form.paymentMethod,
          paymentDate: form.paymentDate,
          reference: form.reference || null,
          packageDuration: form.packageDuration,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Renewal payment recorded");
        router.push(`/dashboard/members/${memberId}`);
      } else {
        toast.error(data.error || data.message || "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return <p className="text-muted-foreground">Member not found</p>;
  }

  const currentMembership = member.Membership?.[0];

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/dashboard/members/${memberId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to member
      </Link>

      <DashboardPageHeader
        title={`Renew — ${member.name}`}
        description={member.phone}
      />

      {currentMembership && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Current plan: {currentMembership.Plan.name}</p>
          <p className="text-muted-foreground">
            Expires {formatDate(currentMembership.endDate)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Plan *</label>
          <SelectNative
            required
            value={form.planId}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)}
              </option>
            ))}
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount *</label>
          <Input
            type="number"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Payment date *</label>
          <Input
            type="date"
            required
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Payment method *</label>
          <SelectNative
            required
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Package duration</label>
          <SelectNative
            value={form.packageDuration}
            onChange={(e) => setForm({ ...form, packageDuration: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="1 Month Renewal">1 Month Renewal</option>
            <option value="3 Months">3 Months</option>
            <option value="6 Months">6 Months</option>
            <option value="12 Months">12 Months</option>
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reference</label>
          <Input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder="UPI ref, receipt #, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Record renewal payment
        </Button>
      </form>
    </div>
  );
}
