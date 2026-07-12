import { Role } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  /**
   * Credentials `authorize` return shape (not full DB User).
   * Granular access control is role-based; see `src/lib/permissions.ts`.
   */
  interface User {
    role: Role;
    isActive?: boolean;
    /** Set on credentials sign-in; drives JWT/session max age in `auth.ts`. */
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isActive?: boolean;
    rememberMe?: boolean;
    /** Last DB sync for `isActive` (middleware reads JWT only). */
    isActiveCheckedAt?: number;
    exp?: number;
    roleRefreshedAt?: number;
  }
}
