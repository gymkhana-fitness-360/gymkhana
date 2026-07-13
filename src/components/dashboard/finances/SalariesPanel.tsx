"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PaymentMethod } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { useActionQueue } from "@/hooks/use-action-queue";
import { toast } from "sonner";
import { Edit, Filter, Loader2, Save, Trash2, User, X } from "lucide-react";
import { getMethodBadge } from "./finances-badges";
import type {
  FinancesEmployee,
  FinancesSalary,
  SalaryFilters,
} from "./finances-types";

const logger = createLogger("salaries-panel");

export interface SalariesPanelHandle {
  openAddForm: () => void;
}

interface SalariesPanelProps {
  salaries: FinancesSalary[];
  employees: FinancesEmployee[];
  loading: boolean;
  filters: SalaryFilters;
  onFiltersChange: (filters: SalaryFilters) => void;
  fetchSalaries: () => Promise<void>;
}

export const SalariesPanel = forwardRef<SalariesPanelHandle, SalariesPanelProps>(
  function SalariesPanel(
    { salaries, employees, loading, filters, onFiltersChange, fetchSalaries },
    ref,
  ) {
    const router = useRouter();
    const { data: session } = useSession();
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<FinancesSalary | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const { enqueueAction, isQueued } = useActionQueue();
    const [salaryForm, setSalaryForm] = useState({
      employeeId: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      method: "UPI" as PaymentMethod,
      reference: "",
      notes: "",
    });

    const handleOpenSalaryForm = (salary?: FinancesSalary) => {
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

    useImperativeHandle(ref, () => ({
      openAddForm: () => handleOpenSalaryForm(),
    }));

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

    const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this salary?")) {
        return;
      }

      const actionKey = `delete-salary:${id}`;
      enqueueAction(actionKey, async () => {
        setDeletingKey(actionKey);
        try {
          const response = await fetch(`/api/salaries/${id}`, {
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
            toast.success("Salary deleted successfully");
            await fetchSalaries();
          } else {
            const error = await response.json();
            toast.error(error.error || "Failed to delete salary");
          }
        } catch (error) {
          logger.error("Error deleting salary:", error as Error);
          toast.error("Failed to delete salary");
        } finally {
          setDeletingKey((current) => (current === actionKey ? null : current));
        }
      });
    };

    const clearFilters = () => {
      onFiltersChange({
        employeeId: "",
        year: "",
        month: "",
        startDate: "",
        endDate: "",
      });
    };

    return (
      <>
        <div className="bg-muted bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/5 shadow-md p-6 border border-border/50 border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-bold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Employee</label>
              <SelectNative
                value={filters.employeeId}
                onChange={(e) => onFiltersChange({ ...filters, employeeId: e.target.value })}
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
              <label className="block text-sm font-semibold text-foreground mb-2">Year</label>
              <Input
                type="number"
                placeholder="e.g., 2025"
                value={filters.year}
                onChange={(e) => onFiltersChange({ ...filters, year: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Month</label>
              <Input
                type="number"
                placeholder="1-12"
                min="1"
                max="12"
                value={filters.month}
                onChange={(e) => onFiltersChange({ ...filters, month: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white bg-background text-foreground font-medium"
              />
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/5 border border-border/50 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Loading...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gradient-to-br from-muted to-muted/80 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No salaries found</h3>
              <p className="text-muted-foreground text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                {Object.values(filters).some((v) => v)
                  ? "No salary records match your current filters. Try adjusting your search criteria."
                  : "Get started by adding your first salary payment record."}
              </p>
              {Object.values(filters).some((v) => v) && (
                <Button
                  type="button"
                  onClick={clearFilters}
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
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${getMethodBadge(salary.method)}`}
                        >
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
                              onClick={() => handleDelete(salary.id)}
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
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-foreground border border-border">
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  {editingItem ? "Edit Salary" : "Add Salary"}
                </h2>
                <Button type="button" onClick={handleCloseForm} className="text-muted-foreground hover:text-foreground">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <form onSubmit={handleSubmitSalary} className="p-6 space-y-6 [&_label]:text-foreground">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Employee *</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Amount *</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Payment Date *</label>
                  <Input
                    type="date"
                    required
                    value={salaryForm.paymentDate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Payment Method *</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Reference</label>
                  <Input
                    type="text"
                    value={salaryForm.reference}
                    onChange={(e) => setSalaryForm({ ...salaryForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                  <Textarea
                    value={salaryForm.notes}
                    onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    rows={3}
                  />
                </div>

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
      </>
    );
  },
);
