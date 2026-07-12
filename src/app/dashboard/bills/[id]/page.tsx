"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Trash2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BillTemplate } from "@/components/bills/bill-template";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { useActionQueue } from "@/hooks/use-action-queue";

const logger = createLogger("dashboard-bills");

interface Bill {
  id: string;
  billNumber: string;
  programType: string;
  amount: string | null;
  paymentMethod: string;
  month: string;
  validFrom: string;
  validTo: string;
  nextPaymentDate: string | null;
  hideAmount: boolean;
  workoutPlan: string;
  notes: string | null;
  createdAt: string;
  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    externalId: string | null;
  };
  generatedBy: {
    name: string;
  };
}

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { enqueueAction, isQueued } = useActionQueue();

  useEffect(() => {
    fetchBill();
  }, [billId]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills/${billId}`);
      if (response.ok) {
        const data = await response.json();
        setBill(data);
      } else {
        alert("Bill not found");
        router.push("/dashboard/bills");
      }
    } catch (error) {
      logger.error("Error fetching bill:", error as Error);
      alert("Failed to load bill");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/dashboard/bills/${billId}/print`, "_blank");
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this bill? This action cannot be undone.")) {
      return;
    }

    enqueueAction(`delete-bill:${billId}`, async () => {
      setDeleting(true);
      try {
        const response = await fetch(`/api/bills/${billId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          router.push("/dashboard/bills");
        } else {
          alert("Failed to delete bill");
        }
      } catch (error) {
        logger.error("Error deleting bill:", error as Error);
        alert("Failed to delete bill");
      } finally {
        setDeleting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-medium">Loading bill...</div>
      </div>
    );
  }

  if (!bill) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/bills"
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              Bill #{bill.billNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Generated on {formatDate(bill.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 font-semibold text-sm active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting || isQueued(`delete-bill:${billId}`)}
            className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 font-semibold text-sm active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Bill Preview */}
      <div className="bg-card rounded-2xl shadow-lg p-8">
        <BillTemplate bill={bill} />
      </div>

      {/* Bill Details */}
      <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Bill Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Bill Number</p>
            <p className="text-base font-mono font-semibold text-foreground">{bill.billNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Program Type</p>
            <p className="text-base font-semibold text-foreground">
              {bill.programType.replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Payment Method</p>
            <p className="text-base font-semibold text-foreground">{bill.paymentMethod}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Amount</p>
            {bill.hideAmount ? (
              <p className="text-base text-muted-foreground italic">Hidden</p>
            ) : (
              <p className="text-base font-bold text-green-600">
                {formatCurrency(Number(bill.amount))}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Month</p>
            <p className="text-base font-semibold text-foreground">{bill.month}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Validity Period</p>
            <p className="text-base font-semibold text-foreground">
              {formatDate(bill.validFrom)} - {formatDate(bill.validTo)}
            </p>
          </div>
          {bill.nextPaymentDate && (
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Next Payment Date</p>
              <p className="text-base font-semibold text-foreground">
                {formatDate(bill.nextPaymentDate)}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Generated By</p>
            <p className="text-base font-semibold text-foreground">{bill.generatedBy.name}</p>
          </div>
          {bill.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground font-medium mb-1">Notes</p>
              <p className="text-base text-foreground">{bill.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Member Details */}
      <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Member Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Name</p>
            <p className="text-base font-semibold text-foreground">{bill.member.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Phone</p>
            <p className="text-base font-semibold text-foreground">{bill.member.phone}</p>
          </div>
          {bill.member.email && (
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Email</p>
              <p className="text-base font-semibold text-foreground">{bill.member.email}</p>
            </div>
          )}
          {bill.member.externalId && (
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Member ID</p>
              <p className="text-base font-mono font-semibold text-foreground">
                {bill.member.externalId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
