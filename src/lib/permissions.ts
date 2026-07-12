import type { AccountMemberRole } from "@prisma/client";
import { Session } from "next-auth";
import { accountRoleHasPermission } from "@/lib/rbac/account-roles";
import type { EffectivePermissionContext } from "@/lib/rbac/types";

/**
 * Role-based access control (RBAC): legacy User.role plus AccountMembership role (ADR-002).
 * When `accountMemberRole` is provided (active account), it takes precedence over User.role.
 */

export type Permission =
  | "canViewMembers"
  | "canEditMembers"
  | "canViewPayments"
  | "canEditPayments"
  | "canViewRenewals"
  | "canEditRenewals"
  | "canViewReminders"
  | "canEditReminders"
  | "canViewReports"
  | "canViewWhatsAppReminders"
  | "canSendWhatsAppReminders"
  | "canSendBulkReminders";

export class PermissionError extends Error {
  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionError";
  }
}

/**
 * Check if user has a specific permission.
 * ADMIN users have all permissions by default.
 * SUB_ADMIN users have limited permissions.
 */
export function hasPermission(
  session: Session | null,
  permission: Permission,
  accountMemberRole: AccountMemberRole | null = null,
): boolean {
  if (!session?.user) return false;

  const ctx: EffectivePermissionContext = {
    accountMemberRole,
    userRole: session.user.role,
  };
  return accountRoleHasPermission(ctx, permission);
}

/**
 * Require a permission or throw PermissionError.
 * Use in API routes to enforce permissions.
 */
export function requirePermission(
  session: Session | null,
  permission: Permission,
  accountMemberRole: AccountMemberRole | null = null,
): void {
  if (!hasPermission(session, permission, accountMemberRole)) {
    throw new PermissionError(permission);
  }
}

/**
 * Check multiple permissions (AND logic).
 */
export function hasAllPermissions(session: Session | null, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(session, p));
}

/**
 * Check if user has any of the permissions (OR logic).
 */
export function hasAnyPermission(session: Session | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(session, p));
}

/**
 * Require any of the permissions or throw.
 */
export function requireAnyPermission(session: Session | null, permissions: Permission[]): void {
  if (!hasAnyPermission(session, permissions)) {
    throw new PermissionError(permissions[0]);
  }
}
