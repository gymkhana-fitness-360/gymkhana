import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingDown } from "lucide-react";
import type { FinancesExpense, FinancesSalary } from "./finances-types";

interface FinancesSummaryCardsProps {
  salaries: FinancesSalary[];
  expenses: FinancesExpense[];
}

export function FinancesSummaryCards({ salaries, expenses }: FinancesSummaryCardsProps) {
  const totalSalaries = Array.isArray(salaries)
    ? salaries.reduce((sum, s) => sum + parseFloat(String(s.amount || 0)), 0)
    : 0;
  const totalExpenses = Array.isArray(expenses)
    ? expenses.reduce((sum, e) => sum + parseFloat(String(e.amount || 0)), 0)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="group relative bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl shadow-green-500/30 dark:shadow-green-500/20 p-8 text-white overflow-hidden hover:shadow-green-500/40 transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-green-50 font-medium opacity-90">Total Salaries</p>
            <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalSalaries)}</p>
            <p className="text-xs text-green-50/80 font-medium">
              {Array.isArray(salaries) ? salaries.length : 0}{" "}
              {salaries.length === 1 ? "payment" : "payments"}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
      <div className="group relative bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 rounded-2xl shadow-2xl shadow-red-500/30 dark:shadow-red-500/20 p-8 text-white overflow-hidden hover:shadow-red-500/40 transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-red-50 font-medium opacity-90">Total Expenses</p>
            <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-red-50/80 font-medium">
              {Array.isArray(expenses) ? expenses.length : 0}{" "}
              {expenses.length === 1 ? "expense" : "expenses"}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
            <TrendingDown className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
