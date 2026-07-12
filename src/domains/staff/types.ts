export interface StaffDTO {
  id: string;
  gymId: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  hireDate: Date | null;
  isActive: boolean;
}

export interface SalaryDTO {
  id: string;
  gymId: string;
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  paidAt: Date | null;
}
