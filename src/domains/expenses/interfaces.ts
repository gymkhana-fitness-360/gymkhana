import type { ExpenseDTO } from "./types";

export interface IExpenseService {
  createExpense(input: Omit<ExpenseDTO, "id" | "createdAt">): Promise<ExpenseDTO>;
  updateExpense(
    gymId: string,
    expenseId: string,
    patch: Partial<Pick<ExpenseDTO, "category" | "amount" | "incurredOn" | "notes">>
  ): Promise<ExpenseDTO>;
  deleteExpense(gymId: string, expenseId: string): Promise<void>;
  listExpenses(gymId: string, from: Date, to: Date): Promise<ExpenseDTO[]>;
}
