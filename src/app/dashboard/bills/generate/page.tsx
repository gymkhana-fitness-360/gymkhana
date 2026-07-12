"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";

const logger = createLogger("dashboard-bills");

interface Member {
  id: string;
  name: string;
  phone: string;
  externalId: string | null;
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

const PROGRAM_TYPES = [
  { value: "MAINTENANCE", label: "Maintenance", description: "General fitness and health maintenance" },
  { value: "BODYBUILDING", label: "Bodybuilding", description: "Muscle building and strength training" },
  { value: "WEIGHT_LOSS", label: "Weight Loss", description: "Fat loss and cardio-focused program" },
];

const PAYMENT_METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

export default function GenerateBillPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    programType: "MAINTENANCE",
    paymentMethod: "UPI",
    amount: "",
    month: MONTHS[new Date().getMonth()],
    validFrom: new Date().toISOString().split("T")[0],
    validTo: "",
    nextPaymentDate: "",
    hideAmount: false,
    notes: "",
  });

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    // Auto-calculate validTo based on validFrom (30 days)
    if (formData.validFrom) {
      const from = new Date(formData.validFrom);
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      
      const nextPayment = new Date(to);
      nextPayment.setDate(nextPayment.getDate() + 1);
      
      setFormData(prev => ({
        ...prev,
        validTo: to.toISOString().split("T")[0],
        nextPaymentDate: nextPayment.toISOString().split("T")[0],
      }));
    }
  }, [formData.validFrom]);

  const searchMembers = async () => {
    try {
      setSearching(true);
      const response = await fetch(`/api/members?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || data);
      }
    } catch (error) {
      logger.error("Error searching members:", error as Error);
    } finally {
      setSearching(false);
    }
  };

  const validateForm = () => {
    const missing: string[] = [];
    
    if (!selectedMember) missing.push("Member");
    if (!formData.programType) missing.push("Program Type");
    if (!formData.paymentMethod) missing.push("Payment Method");
    if (!formData.hideAmount && !formData.amount) missing.push("Amount");
    if (!formData.month) missing.push("Month");
    if (!formData.validFrom) missing.push("Valid From Date");
    if (!formData.validTo) missing.push("Valid To Date");
    
    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: selectedMember?.id,
          programType: formData.programType,
          paymentMethod: formData.paymentMethod,
          amount: formData.hideAmount ? null : parseFloat(formData.amount),
          month: formData.month,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          nextPaymentDate: formData.nextPaymentDate || null,
          hideAmount: formData.hideAmount,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/bills/${data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to generate bill");
      }
    } catch (error) {
      logger.error("Error generating bill:", error as Error);
      alert("Failed to generate bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/bills"
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Generate New Bill
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Create a receipt for Gym Khana member
          </p>
        </div>
      </div>

      {/* Missing Fields Warning */}
      {missingFields.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Missing Required Fields</p>
            <p className="text-sm text-red-700 mt-1">
              Please fill in: {missingFields.join(", ")}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member Selection */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Member Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Search Member (by Name, Phone, or Member ID) *
              </label>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                disabled={!!selectedMember}
              />
              {searching && (
                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
              )}
              {!selectedMember && members.length > 0 && (
                <div className="mt-2 border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {members.map((member) => (
                    <Button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(member);
                        setSearchTerm("");
                        setMembers([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="font-semibold text-foreground">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.phone}</div>
                      {member.externalId && (
                        <div className="text-xs text-muted-foreground font-mono">{member.externalId}</div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
                    {selectedMember.externalId && (
                      <p className="text-xs text-muted-foreground font-mono">{selectedMember.externalId}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Program & Payment Details */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Program & Payment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Program Type *
              </label>
              <SelectNative
                value={formData.programType}
                onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                {PROGRAM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </SelectNative>
              <p className="text-xs text-muted-foreground mt-1">
                {PROGRAM_TYPES.find((t) => t.value === formData.programType)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Payment Method *
              </label>
              <SelectNative
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Amount {!formData.hideAmount && "*"}
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={formData.hideAmount}
                placeholder="Enter amount"
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Month *
              </label>
              <SelectNative
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <CheckboxInput
                  checked={formData.hideAmount}
                  onChange={(e) => setFormData({ ...formData, hideAmount: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-foreground">
                  Hide Amount (for friends & family)
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Bill will be generated without showing the amount
              </p>
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Validity Period</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Valid From *
              </label>
              <Input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Valid To *
              </label>
              <Input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Next Payment Date
              </label>
              <Input
                type="date"
                value={formData.nextPaymentDate}
                onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Additional Notes</h2>
          
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Any additional notes or comments..."
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/bills"
            className="px-6 py-3 border border-border text-foreground rounded-xl hover:bg-muted transition-all duration-200 font-semibold"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Bill
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
