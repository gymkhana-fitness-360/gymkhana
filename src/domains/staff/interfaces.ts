import type { SalaryDTO, StaffDTO } from "./types";

export interface IStaffService {
  listStaff(gymId: string): Promise<StaffDTO[]>;
  getStaff(gymId: string, staffId: string): Promise<StaffDTO | null>;
  recordSalaryPayment(input: {
    gymId: string;
    staffId: string;
    periodStart: Date;
    periodEnd: Date;
    amount: number;
  }): Promise<SalaryDTO>;
}
