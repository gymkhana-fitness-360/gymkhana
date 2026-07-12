"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Send, Loader2, CheckCircle, XCircle, MessageSquare, Calendar, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import {
  WHATSAPP_BUSINESS_LABEL,
  WHATSAPP_FEATURE_DESCRIPTION,
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dashboard-bills");

const PLAN_DURATIONS = [
  { value: "1", label: "1 Month (30 days)" },
  { value: "3", label: "3 Months (90 days)" },
  { value: "6", label: "6 Months (180 days)" },
  { value: "12", label: "1 Year (365 days)" },
];

const PROGRAM_TYPES = [
  { value: "Gym", label: "Gym Only" },
  { value: "Gym with PT", label: "Gym with Personal Training" },
];

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Card", label: "Card" },
  { value: "Bank Transfer", label: "Bank Transfer" },
];

export default function WhatsAppServicePage() {
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admission Card Form
  const [admissionForm, setAdmissionForm] = useState({
    phone: "",
    name: "",
    memberId: "",
    duration: "1",
    programType: "Gym",
    validFrom: new Date().toISOString().split("T")[0],
    validTill: "",
  });

  // Renewal Receipt Form
  const [renewalForm, setRenewalForm] = useState({
    phone: "",
    name: "",
    duration: "1",
    amount: "",
    paymentMethod: "UPI",
    validFrom: new Date().toISOString().split("T")[0],
    validTill: "",
  });

  // Workout Plan Form
  const [workoutForm, setWorkoutForm] = useState({
    phone: "",
    name: "",
  });

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const response = await fetch("/api/whatsapp/health");
      if (response.ok) {
        const data = await response.json();
        setServiceStatus(data.status === "ok" ? "online" : "offline");
      } else {
        setServiceStatus("offline");
      }
    } catch (error) {
      setServiceStatus("offline");
    }
  };

  const fetchMemberByPhone = async (phone: string, formType: "admission" | "renewal" | "workout") => {
    if (phone.length < 10) return;

    try {
      const response = await fetch(`/api/whatsapp/member/${phone.replace(/\D/g, "")}`);
      if (response.ok) {
        const data = await response.json();
        const member = data.data || data.member;
        if (data.success && member) {
          if (formType === "admission") {
            setAdmissionForm(prev => ({
              ...prev,
              name: member.name,
              memberId: member.externalId || member.id,
            }));
          } else if (formType === "renewal") {
            setRenewalForm(prev => ({
              ...prev,
              name: member.name,
            }));
          } else if (formType === "workout") {
            setWorkoutForm(prev => ({
              ...prev,
              name: member.name,
            }));
          }
        }
      }
    } catch (error) {
      logger.error("Error fetching member:", error as Error);
    }
  };

  const calculateValidTill = (validFrom: string, months: string) => {
    const from = new Date(validFrom);
    const daysToAdd = parseInt(months) === 1 ? 30 : parseInt(months) === 3 ? 90 : parseInt(months) === 6 ? 180 : 365;
    const till = new Date(from);
    till.setDate(till.getDate() + daysToAdd);
    return till.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (admissionForm.validFrom && admissionForm.duration) {
      setAdmissionForm(prev => ({
        ...prev,
        validTill: calculateValidTill(prev.validFrom, prev.duration),
      }));
    }
  }, [admissionForm.validFrom, admissionForm.duration]);

  useEffect(() => {
    if (renewalForm.validFrom && renewalForm.duration) {
      setRenewalForm(prev => ({
        ...prev,
        validTill: calculateValidTill(prev.validFrom, prev.duration),
      }));
    }
  }, [renewalForm.validFrom, renewalForm.duration]);

  const sendAdmissionCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: admissionForm.phone,
          templateType: "admission",
          data: {
            name: admissionForm.name,
            memberId: admissionForm.memberId,
            program: `${admissionForm.programType} - ${PLAN_DURATIONS.find((p) => p.value === admissionForm.duration)?.label || admissionForm.duration}`,
            validFrom: admissionForm.validFrom,
            validTill: admissionForm.validTill,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: "success", text: "Admission card sent successfully!" });
        setAdmissionForm({
          phone: "",
          name: "",
          memberId: "",
          duration: "1",
          programType: "Gym",
          validFrom: new Date().toISOString().split("T")[0],
          validTill: "",
        });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send admission card" });
      }
    } catch (error) {
      setMessage({ type: "error", text: WHATSAPP_NOT_CONFIGURED });
    } finally {
      setLoading(false);
    }
  };

  const sendRenewalReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: renewalForm.phone,
          templateType: "renewal",
          data: {
            name: renewalForm.name,
            amount: renewalForm.amount,
            paymentMethod: renewalForm.paymentMethod,
            validFrom: renewalForm.validFrom,
            validTill: renewalForm.validTill,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: "success", text: "Renewal receipt sent successfully!" });
        setRenewalForm({
          phone: "",
          name: "",
          duration: "1",
          amount: "",
          paymentMethod: "UPI",
          validFrom: new Date().toISOString().split("T")[0],
          validTill: "",
        });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send renewal receipt" });
      }
    } catch (error) {
      setMessage({ type: "error", text: WHATSAPP_NOT_CONFIGURED });
    } finally {
      setLoading(false);
    }
  };

  const sendWorkoutPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: workoutForm.phone,
          templateType: "workout",
          data: {
            name: workoutForm.name,
            validityPeriod: "Current",
            startDate: new Date().toISOString().split("T")[0],
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: "success", text: "Workout plan sent successfully!" });
        setWorkoutForm({
          phone: "",
          name: "",
        });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send workout plan" });
      }
    } catch (error) {
      setMessage({ type: "error", text: WHATSAPP_NOT_CONFIGURED });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/bills"
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{WHATSAPP_BUSINESS_LABEL} messages</h1>
          <p className="text-muted-foreground mt-1">
            {WHATSAPP_FEATURE_DESCRIPTION}
          </p>
        </div>
        <Badge variant={serviceStatus === "online" ? "default" : "destructive"}>
          {serviceStatus === "checking" ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : serviceStatus === "online" ? (
            <CheckCircle className="h-3 w-3 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          {serviceStatus === "checking" ? "Checking..." : serviceStatus === "online" ? "API connected" : "Setup required"}
        </Badge>
      </div>

      {/* Service Status Alert */}
      {serviceStatus === "offline" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">{WHATSAPP_BUSINESS_LABEL} API not configured</CardTitle>
            <CardDescription className="text-orange-700">
              {WHATSAPP_SETUP_HINT}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Success/Error Message */}
      {message && (
        <Card className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <p className={message.type === "success" ? "text-green-900" : "text-red-900"}>
                {message.text}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Forms */}
      <Tabs defaultValue="admission" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admission">
            <Calendar className="h-4 w-4 mr-2" />
            Admission Card
          </TabsTrigger>
          <TabsTrigger value="renewal">
            <MessageSquare className="h-4 w-4 mr-2" />
            Renewal Receipt
          </TabsTrigger>
          <TabsTrigger value="workout">
            <Dumbbell className="h-4 w-4 mr-2" />
            Workout Plan
          </TabsTrigger>
        </TabsList>

        {/* Admission Card Tab */}
        <TabsContent value="admission">
          <Card>
            <CardHeader>
              <CardTitle>Send Admission Card</CardTitle>
              <CardDescription>
                Send a formatted admission card to a member via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendAdmissionCard} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                    <Input
                      type="tel"
                      value={admissionForm.phone}
                      onChange={(e) => {
                        setAdmissionForm({ ...admissionForm, phone: e.target.value });
                        fetchMemberByPhone(e.target.value, "admission");
                      }}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                    <Input
                      type="text"
                      value={admissionForm.name}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, name: e.target.value })}
                      placeholder="Member name"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Member ID</label>
                    <Input
                      type="text"
                      value={admissionForm.memberId}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, memberId: e.target.value })}
                      placeholder="Auto-filled or enter manually"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Plan Duration *</label>
                    <SelectNative
                      value={admissionForm.duration}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, duration: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    >
                      {PLAN_DURATIONS.map((plan) => (
                        <option key={plan.value} value={plan.value}>
                          {plan.label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Program Type *</label>
                    <SelectNative
                      value={admissionForm.programType}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, programType: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    >
                      {PROGRAM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Valid From *</label>
                    <Input
                      type="date"
                      value={admissionForm.validFrom}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, validFrom: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Valid Till *</label>
                    <Input
                      type="date"
                      value={admissionForm.validTill}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, validTill: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || serviceStatus !== "online"}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Admission Card
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Renewal Receipt Tab */}
        <TabsContent value="renewal">
          <Card>
            <CardHeader>
              <CardTitle>Send Renewal Receipt</CardTitle>
              <CardDescription>
                Send a formatted renewal receipt to a member via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendRenewalReceipt} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                    <Input
                      type="tel"
                      value={renewalForm.phone}
                      onChange={(e) => {
                        setRenewalForm({ ...renewalForm, phone: e.target.value });
                        fetchMemberByPhone(e.target.value, "renewal");
                      }}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                    <Input
                      type="text"
                      value={renewalForm.name}
                      onChange={(e) => setRenewalForm({ ...renewalForm, name: e.target.value })}
                      placeholder="Member name"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Plan Duration *</label>
                    <SelectNative
                      value={renewalForm.duration}
                      onChange={(e) => setRenewalForm({ ...renewalForm, duration: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    >
                      {PLAN_DURATIONS.map((plan) => (
                        <option key={plan.value} value={plan.value}>
                          {plan.label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Amount *</label>
                    <Input
                      type="number"
                      value={renewalForm.amount}
                      onChange={(e) => setRenewalForm({ ...renewalForm, amount: e.target.value })}
                      placeholder="Enter amount"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Payment Method *</label>
                    <SelectNative
                      value={renewalForm.paymentMethod}
                      onChange={(e) => setRenewalForm({ ...renewalForm, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Valid From *</label>
                    <Input
                      type="date"
                      value={renewalForm.validFrom}
                      onChange={(e) => setRenewalForm({ ...renewalForm, validFrom: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Valid Till *</label>
                    <Input
                      type="date"
                      value={renewalForm.validTill}
                      onChange={(e) => setRenewalForm({ ...renewalForm, validTill: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || serviceStatus !== "online"}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Renewal Receipt
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workout Plan Tab */}
        <TabsContent value="workout">
          <Card>
            <CardHeader>
              <CardTitle>Send Workout Plan</CardTitle>
              <CardDescription>
                Send a weekly workout plan to a member via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendWorkoutPlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                    <Input
                      type="tel"
                      value={workoutForm.phone}
                      onChange={(e) => {
                        setWorkoutForm({ ...workoutForm, phone: e.target.value });
                        fetchMemberByPhone(e.target.value, "workout");
                      }}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                    <Input
                      type="text"
                      value={workoutForm.name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })}
                      placeholder="Member name"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || serviceStatus !== "online"}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Workout Plan
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
