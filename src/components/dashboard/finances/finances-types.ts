import type { ExpenseCategory, ExpenseStatus, ExpenseType, PaymentMethod } from "@prisma/client";

export interface FinancesSalary {
  id: string;
  amount: string;
  paymentDate: string;
  month: number;
  year: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  paidBy: {
    id: string;
    name: string;
  };
}

export interface FinancesExpense {
  id: string;
  description: string;
  category: ExpenseCategory;
  type: ExpenseType;
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  vendor: string | null;
  reference: string | null;
  notes: string | null;
  nextDueDate: string | null;
  status: ExpenseStatus;
  recordedBy: {
    id: string;
    name: string;
  };
}

export interface FinancesEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SalaryFilters {
  employeeId: string;
  year: string;
  month: string;
  startDate: string;
  endDate: string;
}

export interface ExpenseFilters {
  category: ExpenseCategory | "";
  type: ExpenseType | "";
  status: ExpenseStatus | "";
  search: string;
  startDate: string;
  endDate: string;
}
