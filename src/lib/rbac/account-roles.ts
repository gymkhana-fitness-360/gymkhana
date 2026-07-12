import type { AccountMemberRole, Role } from "@prisma/client";
import type { Permission } from "@/lib/permissions";
import type { EffectivePermissionContext } from "@/lib/rbac/types";

export type { EffectivePermissionContext };

const STAFF_READ_PERMISSIONS: Permission[] = [
  "canViewMembers",
  "canViewPayments",
  "canViewRenewals",
  "canViewReminders",
  "canViewReports",
];

const FULL_PERMISSIONS: Permission[] = [
  "canViewMembers",
  "canEditMembers",
  "canViewPayments",
  "canEditPayments",
  "canViewRenewals",
  "canEditRenewals",
  "canViewReminders",
  "canEditReminders",
  "canViewReports",
  "canViewWhatsAppReminders",
  "canSendWhatsAppReminders",
  "canSendBulkReminders",
];

function permissionsForAccountRole(role: AccountMemberRole): Permission[] {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return FULL_PERMISSIONS;
    case "STAFF":
      return STAFF_READ_PERMISSIONS;
    default:
      return STAFF_READ_PERMISSIONS;
  }
}

function permissionsForLegacyUserRole(role: Role): Permission[] {
  if (role === "ADMIN") return FULL_PERMISSIONS;
  return STAFF_READ_PERMISSIONS;
}

/**
 * Resolves dashboard permissions from account membership (preferred) or legacy User.role.
 */
export function resolveAccountPermissions(ctx: EffectivePermissionContext): Set<Permission> {
  if (ctx.accountMemberRole) {
    return new Set(permissionsForAccountRole(ctx.accountMemberRole));
  }
  if (ctx.userRole) {
    return new Set(permissionsForLegacyUserRole(ctx.userRole));
  }
  return new Set();
}

export function accountRoleHasPermission(
  ctx: EffectivePermissionContext,
  permission: Permission,
): boolean {
  return resolveAccountPermissions(ctx).has(permission);
}
