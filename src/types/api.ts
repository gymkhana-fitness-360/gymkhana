import { Member, Payment, User, MemberStatus, PaymentStatus, PaymentMethod, Gender, Role } from "@prisma/client";

// ============ COMMON ============

export interface ApiError {
  error: string;
  details?: any;
  code?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// ============ PAGINATION ============

export interface OffsetPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CursorPagination {
  nextCursor?: string;
  hasMore: boolean;
}

// ============ MEMBER API ============

export interface MemberListItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: MemberStatus;
  joinDate: Date;
  memberships: {
    endDate: Date;
    plan: {
      name: string;
    };
  }[];
}

export interface MemberListResponse {
  members: MemberListItem[];
  pagination?: OffsetPagination;
  cursor?: CursorPagination;
}

export interface CreateMemberRequest {
  name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  planId: string;
  startDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  packageDuration?: string;
  isPersonalTrainer?: boolean;
  friendsFamilyDiscount?: boolean;
  monthlyRate?: number;
  studentOrGymfloPlan?: boolean;
  specialOccasion?: string;
}

export interface UpdateMemberRequest {
  name?: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  status?: MemberStatus;
}

export type MemberResponse = Member;

// ============ PAYMENT API ============

export interface PaymentListItem {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string | null;
  notes?: string | null;
  receivedAt: Date;
  member: {
    id: string;
    name: string;
    phone: string;
  };
  receivedBy: {
    name: string;
  };
}

export interface PaymentListResponse {
  payments: PaymentListItem[];
  pagination?: OffsetPagination;
  cursor?: CursorPagination;
}

export interface CreatePaymentRequest {
  memberId: string;
  amount: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  reference?: string;
  notes?: string;
  packageDuration?: string;
  isPersonalTrainer?: boolean;
  friendsFamilyDiscount?: boolean;
  monthlyRate?: number;
  studentGymfloPlan?: boolean;
  specialOccasion?: string;
  receivedAt?: string;
}

export type PaymentResponse = Payment;

// ============ USER API ============

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  isTrainer: boolean;
  commissionRate?: number | null;
}

export interface UserListResponse {
  users: UserListItem[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: Role;
  canViewMembers?: boolean;
  canEditMembers?: boolean;
  canViewPayments?: boolean;
  canEditPayments?: boolean;
  canViewRenewals?: boolean;
  canEditRenewals?: boolean;
  canViewReminders?: boolean;
  canEditReminders?: boolean;
  canViewReports?: boolean;
  isTrainer?: boolean;
  commissionRate?: number;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
  canViewMembers?: boolean;
  canEditMembers?: boolean;
  canViewPayments?: boolean;
  canEditPayments?: boolean;
  canViewRenewals?: boolean;
  canEditRenewals?: boolean;
  canViewReminders?: boolean;
  canEditReminders?: boolean;
  canViewReports?: boolean;
  isTrainer?: boolean;
  commissionRate?: number;
}

export type UserResponse = Omit<User, "passwordHash">;

// ============ DASHBOARD API ============

export interface DashboardStats {
  totalMembers: number;
  dormantMembers: number;
  todayCollection: number;
  expiringThisWeek: number;
  todayRenewals: number;
}

export interface CollectionStats {
  currentMonth: {
    total: number;
    count: number;
    upToToday: {
      total: number;
      count: number;
    };
  };
  lastMonth: {
    total: number;
    count: number;
    upToSameDay: {
      total: number;
      count: number;
    };
  };
  lastYearSameMonth: {
    total: number;
    count: number;
  };
  today: {
    total: number;
    count: number;
  };
  comparisons: {
    monthOverMonth: {
      current: number;
      last: number;
      difference: number;
      percentageChange: number;
    };
    yearOverYear: {
      current: number;
      last: number;
      difference: number;
      percentageChange: number;
    };
    dayComparison: {
      today: number;
      lastMonthSameDay: number;
      difference: number;
      percentageChange: number;
    };
  };
}
