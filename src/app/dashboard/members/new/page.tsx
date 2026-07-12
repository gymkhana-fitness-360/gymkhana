"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";
import { triggerMemberUpdate } from "@/lib/sidebar-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";

const logger = createLogger("dashboard-members");

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: string;
  description: string | null;
}

export default function NewMemberPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <NewMemberForm />
    </Suspense>
  );
}

function NewMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "UPI",
    paymentReference: "",
    // Payment details
    packageDuration: "",
    isPersonalTrainer: false,
    friendsFamilyDiscount: false,
    monthlyRate: "",
    studentOrGymfloPlan: false,
    specialOccasion: "",
    // Admission fees (default values from March 10, 2026)
    admissionFee: "800",
    personalTrainingFee: "0",
  });

  useEffect(() => {
    fetchPlans();
    const name = searchParams.get("name");
    const phone = searchParams.get("phone");
    if (name || phone) {
      setFormData((prev) => ({
        ...prev,
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
      }));
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      logger.error("Error fetching plans:", error as Error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        const created = result?.data ?? result;
        if (leadId) {
          await fetch(`/api/leads/${leadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONVERTED", convertedMemberId: created.id }),
          }).catch(() => {});
        }
        triggerMemberUpdate();
        router.push(`/dashboard/members/${created.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create member");
      }
    } catch (error) {
      logger.error("Error creating member:", error as Error);
      alert("Failed to create member");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    setFormData({ ...formData, planId });
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setFormData((prev) => ({ ...prev, planId, amount: plan.price }));
    }
  };

  const handlePersonalTrainerChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isPersonalTrainer: checked,
      personalTrainingFee: checked ? "2000" : "0",
    });
  };

  const calculateTotalAmount = () => {
    const planAmount = parseFloat(formData.amount) || 0;
    const admissionFee = parseFloat(formData.admissionFee) || 0;
    const ptFee = parseFloat(formData.personalTrainingFee) || 0;
    return planAmount + admissionFee + ptFee;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/members"
          className="p-2 hover:bg-muted100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Member</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the member details and select a membership plan
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Full Name *
              </label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Phone Number *
              </label>
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Gender
              </label>
              <SelectNative
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Date of Birth
              </label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Emergency Contact
              </label>
              <Input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContact: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Address
              </label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="Full address"
              />
            </div>
          </div>
        </div>

        {/* Membership Plan */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Membership Plan
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Plan is auto-assigned from the total paid amount at admission.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Reference Plan (optional)
              </label>
              <SelectNative
                value={formData.planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="">Choose a plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ₹{plan.price} ({plan.durationDays} days)
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Start Date *
              </label>
              <Input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Plan Amount *
              </label>
              <Input
                type="number"
                required
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Admission Fee *
              </label>
              <Input
                type="number"
                required
                value={formData.admissionFee}
                onChange={(e) =>
                  setFormData({ ...formData, admissionFee: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="800"
              />
              <p className="text-xs text-muted-foreground mt-1">Default: ₹800 (from March 10, 2026)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Personal Training Fee
              </label>
              <Input
                type="number"
                value={formData.personalTrainingFee}
                onChange={(e) =>
                  setFormData({ ...formData, personalTrainingFee: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="0"
                disabled={!formData.isPersonalTrainer}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: ₹2,000 (when PT is selected)</p>
            </div>

            <div className="md:col-span-2">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{calculateTotalAmount().toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Plan Amount:</span>
                    <span>₹{(parseFloat(formData.amount) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admission Fee:</span>
                    <span>₹{(parseFloat(formData.admissionFee) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {formData.isPersonalTrainer && (
                    <div className="flex justify-between">
                      <span>Personal Training:</span>
                      <span>₹{(parseFloat(formData.personalTrainingFee) || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Payment Method *
              </label>
              <SelectNative
                required
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </SelectNative>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Payment Reference (UPI Transaction ID, etc.)
              </label>
              <Input
                type="text"
                value={formData.paymentReference}
                onChange={(e) =>
                  setFormData({ ...formData, paymentReference: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="Transaction ID or reference number"
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Payment Details
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add special payment information for accurate tracking
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Package Duration
              </label>
              <SelectNative
                value={formData.packageDuration}
                onChange={(e) =>
                  setFormData({ ...formData, packageDuration: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="">Select Duration</option>
                <option value="monthly">Monthly</option>
                <option value="3 months">3 Months</option>
                <option value="6 months">6 Months</option>
                <option value="yearly">Yearly</option>
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Monthly Rate (if different)
              </label>
              <Input
                type="number"
                value={formData.monthlyRate}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyRate: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="e.g., 699, 799"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Special Occasion Offer
              </label>
              <SelectNative
                value={formData.specialOccasion}
                onChange={(e) =>
                  setFormData({ ...formData, specialOccasion: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="">None</option>
                <option value="Durga Puja">Durga Puja</option>
                <option value="Kartik Puja">Kartik Puja</option>
                <option value="Valentine's Day">Valentine&apos;s Day</option>
                <option value="Women's Day">Women&apos;s Day</option>
                <option value="Winter Offer">Winter Offer</option>
              </SelectNative>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                Additional Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput
                    checked={formData.isPersonalTrainer}
                    onChange={(e) => handlePersonalTrainerChange(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-foreground font-medium">
                    Personal Trainer (PT) - ₹2,000
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput
                    checked={formData.friendsFamilyDiscount}
                    onChange={(e) =>
                      setFormData({ ...formData, friendsFamilyDiscount: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-foreground font-medium">Friends & Family Discount</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput
                    checked={formData.studentOrGymfloPlan}
                    onChange={(e) =>
                      setFormData({ ...formData, studentOrGymfloPlan: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-foreground font-medium">Student / Fitness360 Plan (2 people)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/members"
            className="px-6 py-2.5 border border-border rounded-xl hover:bg-muted transition-all duration-200 font-semibold"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold active:scale-[0.98]"
          >
            {loading ? "Creating..." : "Create Member"}
          </Button>
        </div>
      </form>
    </div>
  );
}
