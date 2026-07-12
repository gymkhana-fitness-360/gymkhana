'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { ListOrdered, IndianRupee, CircleCheck, CircleDollarSign, Loader2 } from "lucide-react";
import { TrainerLeaderboard } from "@/components/trainers/TrainerLeaderboard";
import { useActionQueue } from "@/hooks/use-action-queue";

const logger = createLogger("dashboard-trainers");

interface Commission {
  id: string;
  amount: number;
  commissionRate: number;
  baseAmount: number;
  month: number;
  year: number;
  isPaid: boolean;
  paidDate: string | null;
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  member: {
    id: string;
    name: string;
    phone: string;
  };
}

interface CommissionSummary {
  totalCommissions: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export default function TrainersPage() {
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [payingCommissionId, setPayingCommissionId] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  useEffect(() => {
    fetchCommissions();
  }, [selectedMonth, selectedYear, filterPaid]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth.toString());
      if (selectedYear) params.append('year', selectedYear.toString());
      if (filterPaid !== 'all') params.append('isPaid', filterPaid);

      const response = await fetch(`/api/trainers/commissions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch commissions');
      
      const data = await response.json();
      setCommissions(data.commissions);
      setSummary(data.summary);
    } catch (error) {
      logger.error('Error fetching commissions:', error as Error);
      alert('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (commissionId: string) => {
    enqueueAction(`mark-commission-paid:${commissionId}`, async () => {
      setPayingCommissionId(commissionId);
      try {
        const response = await fetch('/api/trainers/commissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commissionId, isPaid: true }),
        });

        if (!response.ok) throw new Error('Failed to mark as paid');

        await fetchCommissions();
      } catch (error) {
        logger.error('Error marking commission as paid:', error as Error);
        alert('Failed to mark commission as paid');
      } finally {
        setPayingCommissionId((current) => (current === commissionId ? null : current));
      }
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Trainer Commissions"
        description="Manage trainer commissions and payments"
      />

      <TrainerLeaderboard />

      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total commissions"
            value={String(summary.totalCommissions)}
            icon={ListOrdered}
          />
          <StatCard
            title="Total amount"
            value={`₹${summary.totalAmount.toFixed(2)}`}
            icon={IndianRupee}
          />
          <StatCard
            title="Paid amount"
            value={`₹${summary.paidAmount.toFixed(2)}`}
            icon={CircleCheck}
            variant="success"
          />
          <StatCard
            title="Unpaid amount"
            value={`₹${summary.unpaidAmount.toFixed(2)}`}
            icon={CircleDollarSign}
            variant="warning"
          />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <SelectNative
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value="">All Months</option>
              {monthNames.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </SelectNative>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <SelectNative
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value="">All Years</option>
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </SelectNative>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Status</label>
            <SelectNative
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all">All</option>
              <option value="true">Paid</option>
              <option value="false">Unpaid</option>
            </SelectNative>
          </div>
          <div className="flex items-end">
            <Button onClick={fetchCommissions} className="w-full">
              Apply filters
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trainer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Base Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : commissions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-muted-foreground">
                  No commissions found
                </td>
              </tr>
            ) : (
              commissions.map((commission) => (
                <tr key={commission.id} className="hover:bg-muted">
                  <td className="px-6 py-4">
                    <div className="font-medium">{commission.trainer.name}</div>
                    <div className="text-sm text-muted-foreground">{commission.trainer.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{commission.member.name}</div>
                    <div className="text-sm text-muted-foreground">{commission.member.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    {monthNames[commission.month - 1]} {commission.year}
                  </td>
                  <td className="px-6 py-4">₹{commission.baseAmount.toFixed(2)}</td>
                  <td className="px-6 py-4">{commission.commissionRate}%</td>
                  <td className="px-6 py-4 font-bold">₹{commission.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {commission.isPaid ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!commission.isPaid && (
                      <Button
                        onClick={() => markAsPaid(commission.id)}
                        disabled={isQueued(`mark-commission-paid:${commission.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {payingCommissionId === commission.id || isQueued(`mark-commission-paid:${commission.id}`) ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          "Mark as Paid"
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
