"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BillTemplate } from "@/components/bills/bill-template";
import { createLogger } from "@/lib/logger";

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

export default function PrintBillPage() {
  const params = useParams();
  const billId = params.id as string;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBill();
  }, [billId]);

  useEffect(() => {
    if (bill && !loading) {
      // Auto-print when bill is loaded
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [bill, loading]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills/${billId}`);
      if (response.ok) {
        const data = await response.json();
        setBill(data);
      }
    } catch (error) {
      logger.error("Error fetching bill:", error as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-medium">Loading bill...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 font-medium">Bill not found</div>
      </div>
    );
  }

  return (
    <div className="print:p-0 p-8">
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      <BillTemplate bill={bill} printMode />
    </div>
  );
}
