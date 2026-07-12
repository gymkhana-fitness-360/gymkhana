"use strict";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib-audit-logger.ts");

/**
 * AUDIT LOGGER SERVICE
 * 
 * Centralized audit logging for all critical operations.
 * Logs to AuditLog table for compliance and debugging.
 */

export type AuditAction = 
  | "member_created"
  | "member_updated"
  | "member_status_changed"
  | "membership_created"
  | "membership_extended"
  | "payment_created"
  | "payment_deleted"
  | "payment_pending_review"
  | "overdue_marked_inactive"
  | "overdue_resolved"
  | "plan_created"
  | "plan_updated"
  | "user_created"
  | "user_deleted"
  | "reminder_sent"
  | "whatsapp_sent"
  | "agent_tool_invoked"
  | "agent_client_created"
  | "agent_token_issued";

export interface AuditMetadata {
  [key: string]: any;
}

/**
 * Log an action to the audit trail
 */
export async function logAction(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  metadata?: AuditMetadata
): Promise<void> {
  try {
    const gymId =
      metadata && typeof metadata.gymId === "string" ? metadata.gymId : undefined;
    await prisma.auditLog.create({
      data: {
        userId,
        gymId,
        action,
        entityType,
        entityId,
        details: metadata || {},
      },
    });
  } catch (error) {
    logger.error("[AUDIT] Failed to log action:", error as Error);
    // Don't throw - audit failure shouldn't break the main operation
  }
}

/**
 * Log status change with before/after values
 */
export async function logStatusChange(
  userId: string,
  memberId: string,
  fromStatus: string,
  toStatus: string,
  reason?: string
): Promise<void> {
  await logAction(userId, "member_status_changed", "Member", memberId, {
    fromStatus,
    toStatus,
    reason: reason || "Manual update",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get audit trail for a member
 */
export async function getMemberAuditTrail(memberId: string) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Member", entityId: memberId },
        { entityType: "Membership", details: { path: ["memberId"], equals: memberId } },
        { entityType: "Payment", details: { path: ["memberId"], equals: memberId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { User: { select: { name: true, contactNumber: true } } },
  });
}

/**
 * Get recent audit logs (last 100)
 */
export async function getRecentAuditLogs(limit: number = 100) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { User: { select: { name: true, contactNumber: true } } },
  });
}
