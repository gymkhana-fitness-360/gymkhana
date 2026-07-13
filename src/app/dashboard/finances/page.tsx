"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentMethod, ExpenseCategory, ExpenseType, ExpenseStatus } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { useActionQueue } from "@/hooks/use-action-queue";
import { toast } from "sonner";
import {
  type FinancesEmployee,
  type FinancesExpense,
  type FinancesSalary,
} from "@/components/dashboard/finances/finances-types";
import { useFinancesData } from "@/hooks/use-finances-data";

const logger = createLogger("dashboard-finances");
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  X,
  Save,
  DollarSign,
  TrendingDown,
  Calendar,
  User,
  FileText,
  Loader2,
} from "lucide-react";

interface Salary extends FinancesSalary {}
interface Expense extends FinancesExpense {}
interface User extends FinancesEmployee {}

export default function FinancesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"salaries" | "expenses">("salaries");
  const [salaryFilters, setSalaryFilters] = useState({
    employeeId: "",
    year: "",
    month: "",
    startDate: "",
    endDate: "",
  });
  const [expenseFilters, setExpenseFilters] = useState({
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
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Salary | Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  // Salary form state
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    method: "UPI" as PaymentMethod,
    reference: "",
    notes: "",
  });

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    category: "OTHER" as ExpenseCategory,
    type: "ONE_TIME" as ExpenseType,
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    method: "UPI" as PaymentMethod,
    vendor: "",
    reference: "",
    notes: "",
    nextDueDate: "",
    // Recurring expense fields
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    frequency: "MONTHLY" as "MONTHLY" | "QUARTERLY" | "YEARLY",
    createPastEntries: false,
  });

  // Filters
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

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

  const handleOpenSalaryForm = (salary?: Salary) => {
    if (salary) {
      setEditingItem(salary);
      setSalaryForm({
        employeeId: salary.employee.id,
        amount: salary.amount,
        paymentDate: salary.paymentDate.split("T")[0],
        method: salary.method,
        reference: salary.reference || "",
        notes: salary.notes || "",
      });
    } else {
      setEditingItem(null);
      setSalaryForm({
        employeeId: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        method: "UPI",
        reference: "",
        notes: "",
      });
    }
    setShowForm(true);
  };

  const handleOpenExpenseForm = (expense?: Expense) => {
    if (expense) {
      setEditingItem(expense);
      setExpenseForm({
        description: expense.description,
        category: expense.category,
        type: expense.type,
        amount: expense.amount,
        paymentDate: expense.paymentDate.split("T")[0],
        method: expense.method,
        vendor: expense.vendor || "",
        reference: expense.reference || "",
        notes: expense.notes || "",
        nextDueDate: expense.nextDueDate ? expense.nextDueDate.split("T")[0] : "",
        startDate: expense.paymentDate.split("T")[0],
        endDate: "",
        frequency: "MONTHLY",
        createPastEntries: false,
      });
    } else {
      setEditingItem(null);
      const today = new Date().toISOString().split("T")[0];
      setExpenseForm({
        description: "",
        category: "OTHER",
        type: "ONE_TIME",
        amount: "",
        paymentDate: today,
        method: "UPI",
        vendor: "",
        reference: "",
        notes: "",
        nextDueDate: "",
        startDate: today,
        endDate: "",
        frequency: "MONTHLY",
        createPastEntries: false,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSubmitSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingItem ? `/api/salaries/${editingItem.id}` : "/api/salaries";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salaryForm),
      });

      if (response.ok) {
        await fetchSalaries();
        handleCloseForm();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save salary");
      }
    } catch (error) {
      logger.error("Error saving salary:", error as Error);
      alert("Failed to save salary");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // If editing, just update the single expense
      if (editingItem) {
        const url = `/api/expenses/${editingItem.id}`;
        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: expenseForm.description,
            category: expenseForm.category,
            type: expenseForm.type,
            amount: expenseForm.amount,
            paymentDate: expenseForm.paymentDate,
            method: expenseForm.method,
            vendor: expenseForm.vendor,
            reference: expenseForm.reference,
            notes: expenseForm.notes,
            nextDueDate: expenseForm.type === "RECURRING" ? expenseForm.nextDueDate : null,
          }),
        });

        if (response.ok) {
          await fetchExpenses();
          handleCloseForm();
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          logger.error("Failed to update expense:", errorData as Error);
          alert(errorData.error || "Failed to save expense");
        }
        return;
      }

      // For new expenses
      // If recurring and createPastEntries is true, create multiple entries
      if (expenseForm.type === "RECURRING" && expenseForm.createPastEntries && expenseForm.startDate) {
        const startDate = new Date(expenseForm.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = expenseForm.endDate ? new Date(expenseForm.endDate) : new Date();
        endDate.setHours(23, 59, 59, 999);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const actualEndDate = endDate > today ? today : endDate;

        let created = 0;
        let failed = 0;
        const entries: any[] = [];

        // Calculate periods based on frequency
        let currentDate = new Date(startDate);
        let periodCount = 0;

        while (currentDate <= actualEndDate) {
          const expenseData = {
            description: `${expenseForm.description} (${currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
            category: expenseForm.category,
            type: expenseForm.type,
            amount: expenseForm.amount,
            paymentDate: currentDate.toISOString().split("T")[0],
            method: expenseForm.method,
            vendor: expenseForm.vendor,
            reference: expenseForm.reference ? `${expenseForm.reference}-${periodCount + 1}` : null,
            notes: expenseForm.notes,
            nextDueDate: null, // Will be set for the last entry below
          };

          entries.push(expenseData);

          // Calculate next date based on frequency
          const nextDate = new Date(currentDate);
          if (expenseForm.frequency === "MONTHLY") {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (expenseForm.frequency === "QUARTERLY") {
            nextDate.setMonth(nextDate.getMonth() + 3);
          } else if (expenseForm.frequency === "YEARLY") {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          }
          currentDate = nextDate;
          periodCount++;
        }

        // Set nextDueDate for the last entry
        if (entries.length > 0 && expenseForm.nextDueDate) {
          entries[entries.length - 1].nextDueDate = expenseForm.nextDueDate;
        }

        // Create all expense entries
        for (const expenseData of entries) {
          try {
            const response = await fetch("/api/expenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(expenseData),
            });

            if (response.ok) {
              created++;
            } else {
              failed++;
              const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
              logger.error("Failed to create expense", undefined, { expenseData, apiError: errorData.error || errorData });
            }
          } catch (error) {
            failed++;
            logger.error("Error creating expense", error instanceof Error ? error : undefined, { rawError: String(error) });
          }
        }

        if (created > 0) {
          await fetchExpenses();
          handleCloseForm();
          alert(`Successfully created ${created} expense${created > 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`);
        } else {
          alert(`Failed to create expenses. ${failed > 0 ? `${failed} failed.` : ''} Check console for details.`);
        }
      } else {
        // Single expense creation
        const url = "/api/expenses";
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: expenseForm.description,
            category: expenseForm.category,
            type: expenseForm.type,
            amount: expenseForm.amount,
            paymentDate: expenseForm.paymentDate,
            method: expenseForm.method,
            vendor: expenseForm.vendor,
            reference: expenseForm.reference,
            notes: expenseForm.notes,
            nextDueDate: expenseForm.type === "RECURRING" ? expenseForm.nextDueDate : null,
          }),
        });

        if (response.ok) {
          await fetchExpenses();
          handleCloseForm();
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          logger.error("Failed to create expense:", errorData as Error);
          alert(errorData.error || "Failed to save expense");
        }
      }
    } catch (error) {
      logger.error("Error saving expense:", error as Error);
      alert("Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, type: "salary" | "expense") => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    const actionKey = `delete-${type}:${id}`;
    enqueueAction(actionKey, async () => {
      setDeletingKey(actionKey);
      try {
        const response = await fetch(`/api/${type === "salary" ? "salaries" : "expenses"}/${id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });

        if (response.status === 401) {
          router.replace("/login?callbackUrl=/dashboard/finances");
          return;
        }

        if (response.status === 403) {
          toast.error("Admin access required to delete records");
          return;
        }

        if (response.ok) {
          toast.success(`${type === "salary" ? "Salary" : "Expense"} deleted successfully`);
          if (type === "salary") {
            await fetchSalaries();
          } else {
            await fetchExpenses();
          }
        } else {
          const error = await response.json();
          toast.error(error.error || `Failed to delete ${type}`);
        }
      } catch (error) {
        logger.error(`Error deleting ${type}:`, error as Error);
        toast.error(`Failed to delete ${type}`);
      } finally {
        setDeletingKey((current) => (current === actionKey ? null : current));
      }
    });
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      const res = await fetch(`/api/expenses/${id}/mark-paid`, { method: "POST" });
      if (res.ok) {
        toast.success("Expense marked as paid");
        await fetchExpenses();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to mark as paid");
      }
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    const styles: Record<string, string> = {
      UPI: "bg-blue-100 text-blue-800 border-blue-200",
      CASH: "bg-green-100 text-green-800 border-green-200",
      MIXED: "bg-teal-100 text-teal-800 border-teal-200",
      CARD: "bg-purple-100 text-purple-800 border-purple-200",
      BANK_TRANSFER: "bg-indigo-100 text-indigo-800 border-indigo-200",
      OTHER: "bg-muted text-foreground border-border",
    };
    return styles[method] || styles.OTHER;
  };

  const getExpenseStatusBadge = (status: ExpenseStatus) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-800 border-amber-200",
      PAID: "bg-green-100 text-green-800 border-green-200",
      OVERDUE: "bg-red-100 text-red-800 border-red-200",
    };
    return styles[status] || styles.PAID;
  };

  const getCategoryBadge = (category: ExpenseCategory) => {
    const styles: Record<string, string> = {
      RENT: "bg-red-100 text-red-800 border-red-200",
      UTILITIES: "bg-yellow-100 text-yellow-800 border-yellow-200",
      EQUIPMENT: "bg-blue-100 text-blue-800 border-blue-200",
      MAINTENANCE: "bg-orange-100 text-orange-800 border-orange-200",
      MARKETING: "bg-pink-100 text-pink-800 border-pink-200",
      SUPPLIES: "bg-green-100 text-green-800 border-green-200",
      INSURANCE: "bg-indigo-100 text-indigo-800 border-indigo-200",
      PROFESSIONAL_SERVICES: "bg-purple-100 text-purple-800 border-purple-200",
      SOFTWARE_SUBSCRIPTION: "bg-cyan-100 text-cyan-800 border-cyan-200",
      TRAVEL: "bg-teal-100 text-teal-800 border-teal-200",
      FOOD_BEVERAGES: "bg-amber-100 text-amber-800 border-amber-200",
      OTHER: "bg-muted text-foreground border-border",
    };
    return styles[category] || styles.OTHER;
  };

  const totalSalaries = Array.isArray(salaries) ? salaries.reduce((sum, s) => sum + parseFloat(String(s.amount || 0)), 0) : 0;
  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, e) => sum + parseFloat(String(e.amount || 0)), 0) : 0;

  return (
    <div className="space-y-8 pb-8">
      <DashboardPageHeader
        title="Salaries & expenses"
        description="Manage payroll and track operational expenses"
        actions={
          <Button
            onClick={() =>
              activeTab === "salaries"
                ? handleOpenSalaryForm()
                : handleOpenExpenseForm()
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === "salaries" ? "salary" : "expense"}
          </Button>
        }
      />

      {/* Tabs */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="group relative bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl shadow-green-500/30 dark:shadow-green-500/20 p-8 text-white overflow-hidden hover:shadow-green-500/40 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-green-50 font-medium opacity-90">Total Salaries</p>
              <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalSalaries)}</p>
              <p className="text-xs text-green-50/80 font-medium">
                {Array.isArray(salaries) ? salaries.length : 0} {salaries.length === 1 ? 'payment' : 'payments'}
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
                {Array.isArray(expenses) ? expenses.length : 0} {expenses.length === 1 ? 'expense' : 'expenses'}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {activeTab === "salaries" ? (
        <div className="bg-muted bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/5 shadow-md p-6 border border-border/50 border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-bold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Employee
              </label>
              <SelectNative
                value={salaryFilters.employeeId}
                onChange={(e) => setSalaryFilters({ ...salaryFilters, employeeId: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Year
              </label>
              <Input
                type="number"
                placeholder="e.g., 2025"
                value={salaryFilters.year}
                onChange={(e) => setSalaryFilters({ ...salaryFilters, year: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Month
              </label>
              <Input
                type="number"
                placeholder="1-12"
                min="1"
                max="12"
                value={salaryFilters.month}
                onChange={(e) => setSalaryFilters({ ...salaryFilters, month: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={salaryFilters.startDate}
                onChange={(e) => setSalaryFilters({ ...salaryFilters, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={salaryFilters.endDate}
                onChange={(e) => setSalaryFilters({ ...salaryFilters, endDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/5 shadow-md p-6 border border-border/50 border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-muted-foreground text-muted-foreground" />
            <h3 className="text-lg font-bold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search expenses..."
                value={expenseFilters.search}
                onChange={(e) => setExpenseFilters({ ...expenseFilters, search: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Category
              </label>
              <SelectNative
                value={expenseFilters.category}
                onChange={(e) => setExpenseFilters({ ...expenseFilters, category: e.target.value as ExpenseCategory | "" })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              >
                <option value="">All Categories</option>
                {Object.values(ExpenseCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Type
              </label>
              <SelectNative
                value={expenseFilters.type}
                onChange={(e) => setExpenseFilters({ ...expenseFilters, type: e.target.value as ExpenseType | "" })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              >
                <option value="">All Types</option>
                <option value="RECURRING">Recurring</option>
                <option value="ONE_TIME">One Time</option>
              </SelectNative>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Status
              </label>
              <SelectNative
                value={expenseFilters.status}
                onChange={(e) => setExpenseFilters({ ...expenseFilters, status: e.target.value as ExpenseStatus | "" })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </SelectNative>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={expenseFilters.startDate}
                onChange={(e) => setExpenseFilters({ ...expenseFilters, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={expenseFilters.endDate}
                onChange={(e) => setExpenseFilters({ ...expenseFilters, endDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/5 border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading...</p>
          </div>
        ) : activeTab === "salaries" ? (
          salaries.length === 0 ? (
            <div className="p-20 text-center">
            <div className="bg-gradient-to-br from-muted to-muted/80 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No salaries found</h3>
              <p className="text-muted-foreground text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                {Object.values(salaryFilters).some(v => v) 
                  ? "No salary records match your current filters. Try adjusting your search criteria."
                  : "Get started by adding your first salary payment record."}
              </p>
              {Object.values(salaryFilters).some(v => v) && (
                <Button
                  type="button"
                  onClick={() => setSalaryFilters({ employeeId: "", year: "", month: "", startDate: "", endDate: "" })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Method</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Reference</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Paid By</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card/50 divide-y divide-border/50">
                  {salaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-muted/80">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {formatDate(salary.paymentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">{salary.employee.name}</div>
                        <div className="text-xs text-muted-foreground">{salary.employee.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        {formatCurrency(salary.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${getMethodBadge(salary.method)}`}>
                          {salary.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {salary.reference || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {salary.paidBy.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => handleOpenSalaryForm(salary)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {session?.user?.role === "ADMIN" && (
                            <Button
                              type="button"
                              onClick={() => handleDelete(salary.id, "salary")}
                              disabled={isQueued(`delete-salary:${salary.id}`)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {deletingKey === `delete-salary:${salary.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : expenses.length === 0 ? (
          <div className="p-20 text-center">
            <div className="bg-gradient-to-br from-muted to-muted/80 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No expenses found</h3>
            <p className="text-muted-foreground text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              {Object.values(expenseFilters).some(v => v) 
                ? "No expense records match your current filters. Try adjusting your search criteria."
                : "Get started by adding your first expense record."}
            </p>
            {Object.values(expenseFilters).some(v => v) && (
              <Button
                type="button"
                onClick={() => setExpenseFilters({ search: "", category: "", type: "", status: "", startDate: "", endDate: "" })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Method</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card/50 divide-y divide-border/50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/80">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {formatDate(expense.paymentDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-foreground">{expense.description}</div>
                      {expense.notes && (
                        <div className="text-xs text-muted-foreground mt-1">{expense.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${getCategoryBadge(expense.category)}`}>
                        {expense.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        expense.type === "RECURRING" 
                          ? "bg-purple-100 text-purple-800 border-purple-200" 
                          : "bg-muted text-foreground border-border"
                      } border`}>
                        {expense.type === "RECURRING" ? "Recurring" : "One Time"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${getExpenseStatusBadge(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {expense.vendor || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${getMethodBadge(expense.method)}`}>
                        {expense.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {expense.status !== "PAID" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleMarkPaid(expense.id)}
                            disabled={markingPaidId === expense.id}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            {markingPaidId === expense.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark paid"
                            )}
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => handleOpenExpenseForm(expense)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {session?.user?.role === "ADMIN" && (
                          <Button
                            type="button"
                            onClick={() => handleDelete(expense.id, "expense")}
                            disabled={isQueued(`delete-expense:${expense.id}`)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {deletingKey === `delete-expense:${expense.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-foreground border border-border">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {editingItem ? `Edit ${activeTab === "salaries" ? "Salary" : "Expense"}` : `Add ${activeTab === "salaries" ? "Salary" : "Expense"}`}
              </h2>
              <Button type="button" onClick={handleCloseForm} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </Button>
            </div>

            <form
              onSubmit={activeTab === "salaries" ? handleSubmitSalary : handleSubmitExpense}
              className="p-6 space-y-6 [&_label]:text-foreground"
            >
              {activeTab === "salaries" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Employee *
                    </label>
                    <SelectNative
                      required
                      value={salaryForm.employeeId}
                      onChange={(e) => setSalaryForm({ ...salaryForm, employeeId: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Amount *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={salaryForm.amount}
                      onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Payment Date *
                    </label>
                    <Input
                      type="date"
                      required
                      value={salaryForm.paymentDate}
                      onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Payment Method *
                    </label>
                    <SelectNative
                      required
                      value={salaryForm.method}
                      onChange={(e) => setSalaryForm({ ...salaryForm, method: e.target.value as PaymentMethod })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    >
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Reference
                    </label>
                    <Input
                      type="text"
                      value={salaryForm.reference}
                      onChange={(e) => setSalaryForm({ ...salaryForm, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Notes
                    </label>
                    <Textarea
                      value={salaryForm.notes}
                      onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description *
                    </label>
                    <Input
                      type="text"
                      required
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Category *
                      </label>
                      <SelectNative
                        required
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      >
                        {Object.values(ExpenseCategory).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.replace(/_/g, " ")}
                          </option>
                        ))}
                      </SelectNative>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Type *
                      </label>
                      <SelectNative
                        required
                        value={expenseForm.type}
                        onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value as ExpenseType })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      >
                        <option value="ONE_TIME">One Time</option>
                        <option value="RECURRING">Recurring</option>
                      </SelectNative>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Amount *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  {expenseForm.type === "RECURRING" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Start Date *
                        </label>
                        <Input
                          type="date"
                          required
                          value={expenseForm.startDate}
                          onChange={(e) => {
                            const newStartDate = e.target.value;
                            setExpenseForm({ 
                              ...expenseForm, 
                              startDate: newStartDate,
                              paymentDate: newStartDate, // Update payment date to match start date
                            });
                          }}
                          className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                        />
                        <p className="text-xs text-muted-foreground text-muted-foreground mt-1">
                          First payment date (can be in the past)
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          End Date (Optional)
                        </label>
                        <Input
                          type="date"
                          value={expenseForm.endDate}
                          onChange={(e) => setExpenseForm({ ...expenseForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                        />
                        <p className="text-xs text-muted-foreground text-muted-foreground mt-1">
                          Leave empty to create entries until today
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Frequency *
                        </label>
                        <SelectNative
                          required
                          value={expenseForm.frequency}
                          onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value as "MONTHLY" | "QUARTERLY" | "YEARLY" })}
                          className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="YEARLY">Yearly</option>
                        </SelectNative>
                      </div>
                      {!editingItem && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <CheckboxInput
                            id="createPastEntries"
                            checked={expenseForm.createPastEntries}
                            onChange={(e) => setExpenseForm({ ...expenseForm, createPastEntries: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
                          />
                          <label htmlFor="createPastEntries" className="text-sm font-medium text-foreground cursor-pointer">
                            Create entries for past periods (e.g., if start date is Jan 2025, create entries for Jan, Feb, Mar, etc.)
                          </label>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Next Due Date
                        </label>
                        <Input
                          type="date"
                          value={expenseForm.nextDueDate}
                          onChange={(e) => setExpenseForm({ ...expenseForm, nextDueDate: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                        />
                        <p className="text-xs text-muted-foreground text-muted-foreground mt-1">
                          Next payment due date (for tracking future payments)
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Payment Date *
                      </label>
                      <Input
                        type="date"
                        required
                        value={expenseForm.paymentDate}
                        onChange={(e) => setExpenseForm({ ...expenseForm, paymentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Payment Method *
                    </label>
                    <SelectNative
                      required
                      value={expenseForm.method}
                      onChange={(e) => setExpenseForm({ ...expenseForm, method: e.target.value as PaymentMethod })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    >
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Vendor/Supplier
                    </label>
                    <Input
                      type="text"
                      value={expenseForm.vendor}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Reference/Invoice #
                    </label>
                    <Input
                      type="text"
                      value={expenseForm.reference}
                      onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Notes
                    </label>
                    <Textarea
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border border-border">
                <Button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Saving..." : editingItem ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
