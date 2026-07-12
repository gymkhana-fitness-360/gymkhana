"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MemberDetailData } from "./member-detail-types";

export function MemberPaymentHistory({
  memberId,
  payments,
}: {
  memberId: string;
  payments: MemberDetailData["Payment"];
}) {
  return (
    <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <CreditCard className="h-4 w-4" />
          Add Payment
        </Link>
      </div>
      <div className="overflow-x-auto">
        {!payments?.length ? (
          <p className="p-12 text-center text-muted-foreground">No payments recorded</p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm">{formatDate(payment.receivedAt)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4 text-sm">{payment.method}</td>
                  <td className="px-6 py-4 text-sm">{payment.reference || "—"}</td>
                  <td className="px-6 py-4 text-sm">{payment.User.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
