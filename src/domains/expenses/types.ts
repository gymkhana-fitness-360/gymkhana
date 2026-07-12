export interface ExpenseDTO {
  id: string;
  gymId: string;
  category: string;
  amount: number;
  incurredOn: Date;
  notes: string | null;
  recordedByUserId: string;
  createdAt: Date;
}
