"use client";

import { Settings as SettingsIcon, Users, Bell, CreditCard, Shield, Loader2, Save, Plus, Edit, Trash2, Building2, Eye } from "lucide-react";
import { AgentMcpIntegrations } from "@/components/settings/AgentMcpIntegrations";
import { ErrorLogsPanel } from "@/components/settings/ErrorLogsPanel";
import { useAssumeEmployeeView, setAssumeEmployeeView } from "@/hooks/use-assume-employee-view";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { Label } from "@/components/ui/label";
import { createLogger } from "@/lib/logger";
import { LanguageSwitcher } from "@/components/i18n/locale-provider";
import { ServicesCatalogCard } from "@/components/settings/ServicesCatalogCard";
import { WhatsAppLifecycleTemplatesCard } from "@/components/settings/WhatsAppLifecycleTemplatesCard";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { useActionQueue } from "@/hooks/use-action-queue";

const logger = createLogger("dashboard-settings");

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: string | number;
  description: string | null;
  planType: 'GYM' | 'PT';
  isActive: boolean;
}

interface PlanFormData {
  id?: string;
  name: string;
  durationDays: number;
  price: number;
  description?: string | null;
  planType?: 'GYM' | 'PT';
  isActive?: boolean;
}

const SETTINGS_TABS = ["users", "gym", "session", "notifications", "plans", "agent", "logs", "errors"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function parseSettingsTab(value: string | null): SettingsTab {
  if (value && SETTINGS_TABS.includes(value as SettingsTab)) {
    return value as SettingsTab;
  }
  return "users";
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseSettingsTab(searchParams.get("tab"));
  const assumeEmployeeView = useAssumeEmployeeView();
  const [sessionConfig, setSessionConfig] = useState({ timeoutMinutes: 240 });
  const [notifConfig, setNotifConfig] = useState({
    whatsappEnabled: true,
    renewalDaysBefore: 7,
    renewalOverdueDays: 3,
    birthdayEnabled: true,
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState<PlanFormData | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  const [gymProfile, setGymProfile] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    currencyCode: "INR",
    financialYearStart: "",
    financialYearEnd: "",
    memberCodePrefix: "MEM-",
    billCodePrefix: "GK-",
    chargeAdmissionFee: 0,
    chargeTaxPercent: 0,
    chargeDiscountPresets: "",
  });

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (!session?.user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchSessionConfig();
    fetchNotifConfig();
    fetchPlans();
    fetchGymProfile();
    setLoading(false);
  }, [session, isAdmin]);

  const fetchGymProfile = async () => {
    try {
      const res = await fetch("/api/gym/profile");
      if (res.ok) {
        const data = await res.json();
        setGymProfile({
          name: data.name ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          logoUrl: data.logoUrl ?? "",
          currencyCode: data.currencyCode ?? "INR",
          financialYearStart: data.financialYearStart ? data.financialYearStart.split("T")[0] : "",
          financialYearEnd: data.financialYearEnd ? data.financialYearEnd.split("T")[0] : "",
          memberCodePrefix: data.memberCodePrefix ?? "MEM-",
          billCodePrefix: data.billCodePrefix ?? "GK-",
          chargeAdmissionFee: data.chargeAdmissionFee ?? 0,
          chargeTaxPercent: data.chargeTaxPercent ?? 0,
          chargeDiscountPresets: (data.chargeDiscountPresets ?? []).join(", "),
        });
      }
    } catch {
      // use defaults
    }
  };

  const saveGymProfile = async () => {
    setSaving(true);
    try {
      const presets = gymProfile.chargeDiscountPresets
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !Number.isNaN(n) && n >= 0);
      const res = await fetch("/api/gym/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gymProfile.name,
          address: gymProfile.address || null,
          phone: gymProfile.phone || null,
          email: gymProfile.email || null,
          logoUrl: gymProfile.logoUrl || null,
          currencyCode: gymProfile.currencyCode,
          financialYearStart: gymProfile.financialYearStart || null,
          financialYearEnd: gymProfile.financialYearEnd || null,
          memberCodePrefix: gymProfile.memberCodePrefix,
          billCodePrefix: gymProfile.billCodePrefix,
          chargeAdmissionFee: gymProfile.chargeAdmissionFee,
          chargeTaxPercent: gymProfile.chargeTaxPercent,
          chargeDiscountPresets: presets,
        }),
      });
      if (res.ok) await fetchGymProfile();
      else alert("Failed to save gym profile");
    } finally {
      setSaving(false);
    }
  };

  const fetchSessionConfig = async () => {
    try {
      const res = await fetch("/api/settings/session");
      if (res.ok) {
        const data = await res.json();
        setSessionConfig({ timeoutMinutes: data.timeoutMinutes ?? 240 });
      }
    } catch {
      // use defaults
    }
  };

  const fetchNotifConfig = async () => {
    try {
      const res = await fetch("/api/settings/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifConfig({
          whatsappEnabled: data.whatsappEnabled ?? true,
          renewalDaysBefore: data.renewalDaysBefore ?? 7,
          renewalOverdueDays: data.renewalOverdueDays ?? 3,
          birthdayEnabled: data.birthdayEnabled ?? true,
        });
      }
    } catch {
      // use defaults
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans?all=true");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {
      setPlans([]);
    }
  };

  const saveSessionConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionConfig),
      });
      if (res.ok) await fetchSessionConfig();
      else alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifConfig),
      });
      if (res.ok) await fetchNotifConfig();
      else alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async () => {
    if (!planForm || !planForm.name || !planForm.durationDays || planForm.price == null) return;
    setSaving(true);
    try {
      const url = planForm.id ? `/api/plans/${planForm.id}` : "/api/plans";
      const method = planForm.id ? "PUT" : "POST";
      const body = planForm.id
        ? { name: planForm.name, durationDays: planForm.durationDays, price: planForm.price, description: planForm.description || null, isActive: planForm.isActive !== false }
        : { name: planForm.name, durationDays: planForm.durationDays, price: planForm.price, description: planForm.description || null };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        setPlanForm(null);
        await fetchPlans();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save plan");
      }
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Deactivate this plan? It will no longer appear in member forms.")) return;
    enqueueAction(`delete-plan:${id}`, async () => {
      setDeletingPlanId(id);
      try {
        const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
        if (res.ok) await fetchPlans();
        else alert("Failed to delete");
      } catch {
        alert("Failed to delete");
      } finally {
        setDeletingPlanId((current) => (current === id ? null : current));
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Settings"
          description="Limited access for staff accounts"
        />
        <Card>
          <CardHeader>
            <CardTitle>Administrator required</CardTitle>
            <CardDescription>
              Gym configuration (plans, session timeout, team, audit logs) is available to administrators only.
              Ask your gym owner to update settings, or sign in with an admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Settings"
        description="Configure your gym and application settings"
      />

      <Tabs
        value={activeTab}
        onValueChange={(tab) => router.replace(`/dashboard/settings?tab=${tab}`, { scroll: false })}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
          <TabsTrigger value="users">Users & RBAC</TabsTrigger>
          <TabsTrigger value="gym">Gym</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="agent">AI & MCP</TabsTrigger>
          <TabsTrigger value="logs">Action Logs</TabsTrigger>
          {session?.user?.role === "ADMIN" ? (
            <TabsTrigger value="errors">Errors</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management & RBAC
              </CardTitle>
              <CardDescription>Manage employees, roles (Admin/Employee), and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/employees">
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Employees
                </Button>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Add, edit, or remove users. Assign Admin or Employee (SUB_ADMIN) roles. Employees have view-only access to members, payments, renewals, and reminders.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gym" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Gym Profile
              </CardTitle>
              <CardDescription>Name, branding, currency, financial year, and charge policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="gymName">Gym name</Label>
                  <Input id="gymName" value={gymProfile.name} onChange={(e) => setGymProfile({ ...gymProfile, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="currencyCode">Currency code</Label>
                  <Input id="currencyCode" value={gymProfile.currencyCode} onChange={(e) => setGymProfile({ ...gymProfile, currencyCode: e.target.value.toUpperCase() })} className="mt-1" maxLength={3} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={gymProfile.address} onChange={(e) => setGymProfile({ ...gymProfile, address: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gymPhone">Phone</Label>
                  <Input id="gymPhone" value={gymProfile.phone} onChange={(e) => setGymProfile({ ...gymProfile, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gymEmail">Email</Label>
                  <Input id="gymEmail" type="email" value={gymProfile.email} onChange={(e) => setGymProfile({ ...gymProfile, email: e.target.value })} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input id="logoUrl" value={gymProfile.logoUrl} onChange={(e) => setGymProfile({ ...gymProfile, logoUrl: e.target.value })} className="mt-1" placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="fyStart">Financial year start</Label>
                  <Input id="fyStart" type="date" value={gymProfile.financialYearStart} onChange={(e) => setGymProfile({ ...gymProfile, financialYearStart: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="fyEnd">Financial year end</Label>
                  <Input id="fyEnd" type="date" value={gymProfile.financialYearEnd} onChange={(e) => setGymProfile({ ...gymProfile, financialYearEnd: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="memberPrefix">Member code prefix</Label>
                  <Input id="memberPrefix" value={gymProfile.memberCodePrefix} onChange={(e) => setGymProfile({ ...gymProfile, memberCodePrefix: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="billPrefix">Bill code prefix</Label>
                  <Input id="billPrefix" value={gymProfile.billCodePrefix} onChange={(e) => setGymProfile({ ...gymProfile, billCodePrefix: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Charge policy</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="admissionFee">Admission fee</Label>
                    <Input id="admissionFee" type="number" min={0} value={gymProfile.chargeAdmissionFee} onChange={(e) => setGymProfile({ ...gymProfile, chargeAdmissionFee: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="taxPercent">Tax %</Label>
                    <Input id="taxPercent" type="number" min={0} max={100} value={gymProfile.chargeTaxPercent} onChange={(e) => setGymProfile({ ...gymProfile, chargeTaxPercent: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="discountPresets">Discount presets (comma-separated)</Label>
                    <Input id="discountPresets" value={gymProfile.chargeDiscountPresets} onChange={(e) => setGymProfile({ ...gymProfile, chargeDiscountPresets: e.target.value })} className="mt-1" placeholder="50, 100, 200" />
                  </div>
                </div>
              </div>
              <Button onClick={saveGymProfile} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save gym profile
              </Button>
              <div className="pt-4 border-t border-border">
                <Label>Dashboard language</Label>
                <div className="mt-2">
                  <LanguageSwitcher />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Session & Security
              </CardTitle>
              <CardDescription>Configure inactivity logout for non-admin users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timeout">Inactivity timeout (minutes)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={15}
                  max={10080}
                  value={sessionConfig.timeoutMinutes}
                  onChange={(e) => setSessionConfig({ ...sessionConfig, timeoutMinutes: parseInt(e.target.value) || 240 })}
                  className="mt-1 max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Non-admin users will be logged out after this many minutes of inactivity. Session timeout is not applicable to admins. Default: 240 (4 hours).</p>
              </div>
              <Button onClick={saveSessionConfig} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              {session?.user?.role === "ADMIN" ? (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Employee preview
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    See the dashboard as staff — limited sidebar and mobile nav.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={assumeEmployeeView ? "default" : "outline"}
                      onClick={() => setAssumeEmployeeView(true, { router, navigate: true })}
                    >
                      Enter preview
                    </Button>
                    <Button
                      type="button"
                      variant={!assumeEmployeeView ? "default" : "outline"}
                      onClick={() => setAssumeEmployeeView(false, { router, navigate: true })}
                    >
                      Exit preview
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure renewal reminders and WhatsApp Business API preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckboxInput
                  id="whatsapp"
                  checked={notifConfig.whatsappEnabled}
                  onChange={(e) => setNotifConfig({ ...notifConfig, whatsappEnabled: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="whatsapp">WhatsApp Business reminders enabled</Label>
              </div>
              <div>
                <Label htmlFor="renewalDays">Renewal reminder (days before expiry)</Label>
                <Input
                  id="renewalDays"
                  type="number"
                  min={1}
                  max={30}
                  value={notifConfig.renewalDaysBefore}
                  onChange={(e) => setNotifConfig({ ...notifConfig, renewalDaysBefore: parseInt(e.target.value) || 7 })}
                  className="mt-1 max-w-xs"
                />
              </div>
              <div>
                <Label htmlFor="overdueDays">Overdue reminder (days after expiry)</Label>
                <Input
                  id="overdueDays"
                  type="number"
                  min={0}
                  max={14}
                  value={notifConfig.renewalOverdueDays}
                  onChange={(e) => setNotifConfig({ ...notifConfig, renewalOverdueDays: parseInt(e.target.value) || 3 })}
                  className="mt-1 max-w-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <CheckboxInput
                  id="birthday"
                  checked={notifConfig.birthdayEnabled}
                  onChange={(e) => setNotifConfig({ ...notifConfig, birthdayEnabled: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="birthday">Birthday reminders enabled</Label>
              </div>
              <Button onClick={saveNotifConfig} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </CardContent>
          </Card>
          <WhatsAppLifecycleTemplatesCard />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Plan Management
              </CardTitle>
              <CardDescription>
                Add price variations for membership plans. Multiple prices can exist for the same duration (e.g., Monthly Gym at ₹699, ₹700, ₹750, ₹800).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setPlanForm({ name: "", durationDays: 30, price: 0 } as PlanFormData)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Price Variant
              </Button>

              {planForm && (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <h4 className="font-medium">{planForm.id ? "Edit Price Variant" : "New Price Variant"}</h4>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <Label>Plan Type</Label>
                      <select
                        value={planForm.planType || 'GYM'}
                        onChange={(e) => setPlanForm({ ...planForm, planType: e.target.value as 'GYM' | 'PT' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="GYM">💪 Gym</option>
                        <option value="PT">🏋️ Personal Training</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Gym or PT plan</p>
                    </div>
                    <div>
                      <Label>Plan Name</Label>
                      <Input
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        placeholder="e.g. Monthly Gym"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Use same name for price variations</p>
                    </div>
                    <div>
                      <Label>Duration (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={planForm.durationDays}
                        onChange={(e) => setPlanForm({ ...planForm, durationDays: parseInt(e.target.value) || 30 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">30 = Monthly, 90 = 3 Months</p>
                    </div>
                    <div>
                      <Label>Price (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={planForm.price}
                        onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Historical or current price</p>
                    </div>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Input
                      value={planForm.description || ""}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value || undefined })}
                      placeholder="e.g. Old pricing, New rate, PT included"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={savePlan} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setPlanForm(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* GYM Plans */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 pb-2 border-b-2 border-purple-500">
                    <span className="text-2xl">💪</span>
                    <span>Gym Plans</span>
                    <span className="text-sm font-normal text-muted-foreground">({plans.filter(p => p.planType === 'GYM').length})</span>
                  </h3>
                  <div className="space-y-4">
                    {[30, 90, 180, 365].map(duration => {
                      const durationPlans = plans
                        .filter(p => p.planType === 'GYM' && p.durationDays === duration)
                        .sort((a, b) => Number(a.price) - Number(b.price));
                      
                      if (durationPlans.length === 0) return null;
                      
                      const durationColor = 
                        duration === 30 ? { bg: 'bg-purple-500/10', border: 'border-l-purple-400', text: 'text-purple-600 dark:text-purple-400' } :
                        duration === 90 ? { bg: 'bg-purple-500/20', border: 'border-l-purple-500', text: 'text-purple-600 dark:text-purple-400' } :
                        duration === 180 ? { bg: 'bg-purple-500/30', border: 'border-l-purple-600', text: 'text-purple-700 dark:text-purple-300' } :
                        { bg: 'bg-purple-500/40', border: 'border-l-purple-700', text: 'text-purple-800 dark:text-purple-200' };
                      
                      const durationLabel = 
                        duration === 30 ? 'Monthly' :
                        duration === 90 ? '3 Months' :
                        duration === 180 ? '6 Months' : '12 Months';
                      
                      return (
                        <div key={duration} className={`rounded-lg border-l-4 ${durationColor.border} ${durationColor.bg} p-3`}>
                          <h4 className={`font-semibold text-sm mb-2 ${durationColor.text}`}>{durationLabel} ({duration} days)</h4>
                          <div className="space-y-2">
                            {durationPlans.map(p => (
                              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded bg-card/50 hover:bg-card transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground">₹{Number(p.price).toLocaleString('en-IN')}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.isActive ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                                      {p.isActive ? "Active" : "Inactive"}
                                    </span>
                                  </div>
                                  {p.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => setPlanForm({ ...p, name: p.name, durationDays: p.durationDays, price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price), planType: p.planType })} className="h-7 w-7 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  {p.isActive && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePlan(p.id)}
                                      disabled={isQueued(`delete-plan:${p.id}`)}
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    >
                                      {deletingPlanId === p.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PT Plans */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 pb-2 border-b-2 border-amber-500">
                    <span className="text-2xl">🏋️</span>
                    <span>PT Plans</span>
                    <span className="text-sm font-normal text-muted-foreground">({plans.filter(p => p.planType === 'PT').length})</span>
                  </h3>
                  <div className="space-y-4">
                    {[30, 90, 180, 365].map(duration => {
                      const durationPlans = plans
                        .filter(p => p.planType === 'PT' && p.durationDays === duration)
                        .sort((a, b) => Number(a.price) - Number(b.price));
                      
                      if (durationPlans.length === 0) return null;
                      
                      const durationColor = 
                        duration === 30 ? { bg: 'bg-amber-500/10', border: 'border-l-amber-400', text: 'text-amber-600 dark:text-amber-400' } :
                        duration === 90 ? { bg: 'bg-amber-500/20', border: 'border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' } :
                        duration === 180 ? { bg: 'bg-amber-500/30', border: 'border-l-amber-600', text: 'text-amber-700 dark:text-amber-300' } :
                        { bg: 'bg-amber-500/40', border: 'border-l-amber-700', text: 'text-amber-800 dark:text-amber-200' };
                      
                      const durationLabel = 
                        duration === 30 ? 'Monthly' :
                        duration === 90 ? '3 Months' :
                        duration === 180 ? '6 Months' : '12 Months';
                      
                      return (
                        <div key={duration} className={`rounded-lg border-l-4 ${durationColor.border} ${durationColor.bg} p-3`}>
                          <h4 className={`font-semibold text-sm mb-2 ${durationColor.text}`}>{durationLabel} ({duration} days)</h4>
                          <div className="space-y-2">
                            {durationPlans.map(p => (
                              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded bg-card/50 hover:bg-card transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground">₹{Number(p.price).toLocaleString('en-IN')}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.isActive ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                                      {p.isActive ? "Active" : "Inactive"}
                                    </span>
                                  </div>
                                  {p.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => setPlanForm({ ...p, name: p.name, durationDays: p.durationDays, price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price), planType: p.planType })} className="h-7 w-7 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  {p.isActive && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePlan(p.id)}
                                      disabled={isQueued(`delete-plan:${p.id}`)}
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    >
                                      {deletingPlanId === p.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {/* Color Legend */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className="text-sm text-foreground font-medium mb-3">🎨 Color Legend:</p>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-semibold flex items-center gap-2 mb-2">
                        💪 Gym Plans <span className="text-xs font-normal text-muted-foreground">(Purple shades)</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 ml-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-400"></div>
                          <span className="text-xs text-muted-foreground">Monthly (lighter)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-500"></div>
                          <span className="text-xs text-muted-foreground">3 Month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-600"></div>
                          <span className="text-xs text-muted-foreground">6 Month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-700"></div>
                          <span className="text-xs text-muted-foreground">12 Month (darker)</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold flex items-center gap-2 mb-2">
                        🏋️ PT Plans <span className="text-xs font-normal text-muted-foreground">(Golden shades)</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 ml-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-amber-400"></div>
                          <span className="text-xs text-muted-foreground">Monthly (lighter)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-amber-500"></div>
                          <span className="text-xs text-muted-foreground">3 Month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-amber-600"></div>
                          <span className="text-xs text-muted-foreground">6 Month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-amber-700"></div>
                          <span className="text-xs text-muted-foreground">12 Month (darker)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan Rules */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-sm text-foreground font-medium mb-2">💡 Plan Structure & Rules:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li><strong>Gym Plans</strong>: Monthly (₹699-800), 3 Month (₹1799-2099), 6 Month (₹2999-3599), 12 Month (₹4899-5999)</li>
                    <li><strong>PT Plans</strong>: Monthly (₹1500-2000), 3 Month (₹3600-5400), 6 Month (₹7200-9000), 12 Month (₹9000-14000)</li>
                    <li><strong>Combination</strong>: Members can have 1 Gym + 1 PT plan (tracked separately for renewals & overdue)</li>
                    <li><strong>Restrictions</strong>: No 2 Gym plans or 2 PT plans for same member</li>
                    <li>System will auto-match payments to the closest price variant</li>
                    <li>Deactivate old prices to hide them from new member forms</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          <ServicesCatalogCard />
        </TabsContent>

        <TabsContent value="agent" className="space-y-4">
          {process.env.NEXT_PUBLIC_ENABLE_AGENT_API === "true" ? (
            <AgentMcpIntegrations />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Agent &amp; MCP integrations</CardTitle>
                <CardDescription>
                  Available when ENABLE_AGENT_API is enabled for your deployment. Developer
                  docs and the public playground live on the marketing site.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://www.gymkhana.fit"}
                  className="text-sm text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open developers portal →
                </a>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Action Logs
              </CardTitle>
              <CardDescription>View all actions performed by users on the portal</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionLogsViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorLogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActionLogsViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [offset]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      logger.error("Failed to fetch logs", e as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No action logs found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} logs
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium text-foreground">{log.User?.name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{log.User?.contactNumber}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {log.entityType}
                  {log.entityId && (
                    <div className="text-xs font-mono mt-0.5">{log.entityId.slice(0, 8)}...</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
