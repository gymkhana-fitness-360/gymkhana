import { useCallback, useState } from "react";
import { createLogger } from "@/lib/logger";
import type {
  ExpenseFilters,
  FinancesEmployee,
  FinancesExpense,
  FinancesSalary,
  SalaryFilters,
} from "@/components/dashboard/finances/finances-types";

const logger = createLogger("use-finances-data");

export function useFinancesData(
  salaryFilters: SalaryFilters,
  expenseFilters: ExpenseFilters,
) {
  const [salaries, setSalaries] = useState<FinancesSalary[]>([]);
  const [expenses, setExpenses] = useState<FinancesExpense[]>([]);
  const [employees, setEmployees] = useState<FinancesEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      logger.error("Error fetching employees:", error as Error);
    }
  }, []);

  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (salaryFilters.employeeId) params.append("employeeId", salaryFilters.employeeId);
      if (salaryFilters.year) params.append("year", salaryFilters.year);
      if (salaryFilters.month) params.append("month", salaryFilters.month);
      if (salaryFilters.startDate) params.append("startDate", salaryFilters.startDate);
      if (salaryFilters.endDate) params.append("endDate", salaryFilters.endDate);

      const response = await fetch(`/api/salaries?${params}`);
      const data = await response.json();
      const salariesArray = Array.isArray(data.salaries)
        ? data.salaries
        : Array.isArray(data)
          ? data
          : [];
      setSalaries(salariesArray);
    } catch (error) {
      logger.error("Error fetching salaries:", error as Error);
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  }, [salaryFilters]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (expenseFilters.category) params.append("category", expenseFilters.category);
      if (expenseFilters.type) params.append("type", expenseFilters.type);
      if (expenseFilters.status) params.append("status", expenseFilters.status);
      if (expenseFilters.search) params.append("search", expenseFilters.search);
      if (expenseFilters.startDate) params.append("startDate", expenseFilters.startDate);
      if (expenseFilters.endDate) params.append("endDate", expenseFilters.endDate);

      const response = await fetch(`/api/expenses?${params}`);
      const data = await response.json();
      const expensesArray = Array.isArray(data.expenses)
        ? data.expenses
        : Array.isArray(data)
          ? data
          : [];
      setExpenses(expensesArray);
    } catch (error) {
      logger.error("Error fetching expenses:", error as Error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [expenseFilters]);

  return {
    salaries,
    expenses,
    employees,
    loading,
    setSalaries,
    setExpenses,
    fetchEmployees,
    fetchSalaries,
    fetchExpenses,
  };
}
