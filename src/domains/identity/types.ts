/**
 * Identity — users, roles, sessions (DTOs only).
 */

export type UserRole = "OWNER" | "ADMIN" | "STAFF" | "TRAINER" | "MEMBER_PORTAL";

export interface UserDTO {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: UserRole;
}

export interface SessionContextDTO {
  userId: string;
  gymId: string | null;
  roles: UserRole[];
}
