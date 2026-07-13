"use client";

import { useEffect, useRef, useState } from "react";
import { ExpenseCategory, ExpenseStatus, ExpenseType } from "@prisma/client";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { FinancesSummaryCards } from "@/components/dashboard/finances/FinancesSummaryCards";
import {
  ExpensesPanel,
  type ExpensesPanelHandle,
} from "@/components/dashboard/finances/ExpensesPanel";
import {
  SalariesPanel,
  type SalariesPanelHandle,
} from "@/components/dashboard/finances/SalariesPanel";
import type { ExpenseFilters, SalaryFilters } from "@/components/dashboard/finances/finances-types";
import { Button } from "@/components/ui/button";
import { useFinancesData } from "@/hooks/use-finances-data";
import { DollarSign, Plus, TrendingDown } from "lucide-react";

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<"salaries" | "expenses">("salaries");
  const [salaryFilters, setSalaryFilters] = useState<SalaryFilters>({
    employeeId: "",
    year: "",
    month: "",
    startDate: "",
    endDate: "",
  });
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({
    category: "" as ExpenseCategory | "",
    type: "" as ExpenseType | "",
    status: "" as ExpenseStatus | "",
    search: "",
    startDate: "",
    endDate: "",
  });

  const {
    salaries,
    expenses,
    employees,
    loading,
    fetchEmployees,
    fetchSalaries,
    fetchExpenses,
  } = useFinancesData(salaryFilters, expenseFilters);

  const salariesPanelRef = useRef<SalariesPanelHandle>(null);
  const expensesPanelRef = useRef<ExpensesPanelHandle>(null);

  useEffect(() => {
    fetchEmployees();
    if (activeTab === "salaries") {
      fetchSalaries();
    } else {
      fetchExpenses();
    }
  }, [activeTab, fetchEmployees, fetchSalaries, fetchExpenses]);

  useEffect(() => {
    if (activeTab === "salaries") {
      fetchSalaries();
    } else {
      fetchExpenses();
    }
  }, [salaryFilters, expenseFilters, activeTab, fetchSalaries, fetchExpenses]);

  return (
    <div className="space-y-8 pb-8">
      <DashboardPageHeader
        title="Salaries & expenses"
        description="Manage payroll and track operational expenses"
        actions={
          <Button
            onClick={() =>
              activeTab === "salaries"
                ? salariesPanelRef.current?.openAddForm()
                : expensesPanelRef.current?.openAddForm()
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === "salaries" ? "salary" : "expense"}
          </Button>
        }
      />

      <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/5 shadow-md border border-border/50 p-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setActiveTab("salaries")}
            className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === "salaries"
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                : "text-muted-foreground text-muted-foreground hover:text-foreground dark:hover:text-gray-100 hover:bg-gray-100 hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-center gap-2.5">
              <DollarSign className="h-5 w-5" />
              <span>Salaries</span>
            </div>
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === "expenses"
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                : "text-muted-foreground text-muted-foreground hover:text-foreground dark:hover:text-gray-100 hover:bg-gray-100 hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-center gap-2.5">
              <TrendingDown className="h-5 w-5" />
              <span>Expenses</span>
            </div>
          </Button>
        </div>
      </div>

      <FinancesSummaryCards salaries={salaries} expenses={expenses} />

      {activeTab === "salaries" ? (
        <SalariesPanel
          ref={salariesPanelRef}
          salaries={salaries}
          employees={employees}
          loading={loading}
          filters={salaryFilters}
          onFiltersChange={setSalaryFilters}
          fetchSalaries={fetchSalaries}
        />
      ) : (
        <ExpensesPanel
          ref={expensesPanelRef}
          expenses={expenses}
          loading={loading}
          filters={expenseFilters}
          onFiltersChange={setExpenseFilters}
          fetchExpenses={fetchExpenses}
        />
      )}
    </div>
  );
}
