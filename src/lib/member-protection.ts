/**
 * Member Protection
 *
 * Protects reserved members (MEM-001 to MEM-609) from unauthorized modifications.
 * Admin member IDs (MEM000, MEMXXX) are reserved for admins - do not change.
 */

import { Member } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminPhoneToIdMap } from "@/lib/member-protection-env";
import { isMemberProtectionEnabled } from "@/lib/member-protection-config";
import { generateNextMemberCode } from "@/lib/gym-settings/code-sequences";

export class MemberProtectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberProtectionError";
  }
}

/**
 * Check if a member is a protected member
 */
export function isProtectedMember(id: string | null | undefined): boolean {
  return id?.startsWith('MEM-') || false;
}

/**
 * Check if externalId is an admin-reserved member ID (MEM000, MEMXXX). Do not change.
 */
export function isAdminMember(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === "MEM000" || id === "MEMXXX";
}

/**
 * Check if member has any protected ID (protected member or admin)
 */
function isProtectedId(id: string | null | undefined): boolean {
  return isProtectedMember(id) || isAdminMember(id);
}

/**
 * Get admin member ID for phone if it's an admin. Returns null otherwise.
 */
export function getAdminMemberIdForPhone(phone: string): string | null {
  const map = getAdminPhoneToIdMap();
  const normalized = phone.replace(/\D/g, '');
  const withoutCountry = normalized.length === 12 && normalized.startsWith('91')
    ? normalized.slice(2)
    : normalized;
  return map[withoutCountry] ?? map[normalized] ?? null;
}

/**
 * Validate that a protected member is not being modified in a protected way
 */
export function validateMemberModification(
  member: { id: string; name: string },
  operation: 'update' | 'delete',
  allowedFields?: string[]
) {
  if (!isMemberProtectionEnabled()) return;
  if (!isProtectedId(member.id)) {
    return; // Not protected, allow modification
  }

  const msg = isAdminMember(member.id)
    ? `Cannot ${operation} admin member ${member.id} (${member.name}). Admin member IDs (MEM000, MEMXXX) are reserved and cannot be modified.`
    : `Cannot ${operation} protected member ${member.id} (${member.name}). ` +
      `Protected members cannot be modified manually. ` +
      `If you need to update this member's data, please contact an administrator.`;

  throw new MemberProtectionError(msg);
}

/**
 * Validate that only allowed fields are being updated for a protected member
 */
export function validateMemberFieldUpdate(
  member: { id: string; name: string },
  updateData: Partial<Record<string, unknown>>
): void {
  if (!isMemberProtectionEnabled()) return;
  if (!isProtectedId(member.id)) {
    return; // Not protected, allow all updates
  }

  // Fields that CAN be updated for protected members (supplementary data)
  const allowedFields = [
    'address',
    'emergencyContact',
    'photo',
    'gender',
    'dateOfBirth',
  ];

  // Fields that CANNOT be updated for protected members (protected data)
  const protectedFields = [
    'externalId',
    'name',
    'phone',
    'joinDate',
    'status',
  ];

  const attemptedFields = Object.keys(updateData);
  const disallowedFields = attemptedFields.filter(
    field => !allowedFields.includes(field) && protectedFields.includes(field)
  );

  if (disallowedFields.length > 0) {
    const baseMsg = isAdminMember(member.id)
      ? `Cannot update protected fields [${disallowedFields.join(', ')}] for admin member ${member.id} (${member.name}). Admin member IDs are reserved.`
      : `Cannot update protected fields [${disallowedFields.join(', ')}] for protected member ${member.id} (${member.name}). ` +
        `These fields are protected. ` +
        `You can only update: ${allowedFields.join(', ')}`;
    throw new MemberProtectionError(baseMsg);
  }
}

/**
 * Get member and validate member protection before modification
 */
export async function getMemberWithProtectionCheck(
  memberId: string,
  operation: 'update' | 'delete',
  gymId: string
): Promise<Member> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: {
      id: true,
      gymId: true,
      name: true,
      phone: true,
      gender: true,
      dateOfBirth: true,
      address: true,
      emergencyContact: true,
      photo: true,
      status: true,
      joinDate: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  // For delete operations, always block protected members
  if (operation === 'delete') {
    validateMemberModification(member, operation);
  }

  return member as Member;
}

/**
 * Audit log for member modifications
 */
export interface MemberAuditLog {
  memberId: string;
  memberExternalId?: string;
  memberName: string;
  operation: 'create' | 'update' | 'delete';
  userId: string;
  userName: string;
  timestamp: Date;
  changes?: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
}

/**
 * Log member modification for audit trail
 */
export async function logMemberModification(log: MemberAuditLog): Promise<void> {
  // Store in audit log table for compliance
  await prisma.auditLog.create({
    data: {
      action: log.operation.toUpperCase(),
      entityType: 'Member',
      entityId: log.memberId,
      userId: log.userId,
      details: JSON.parse(JSON.stringify({
        memberExternalId: log.memberExternalId,
        memberName: log.memberName,
        userName: log.userName,
        changes: log.changes,
        reason: log.reason,
      })),
    },
  });
}

/**
 * Get member ID for a new member. Uses admin-reserved ID if phone matches, else next sequential.
 */
export async function getNextMemberId(phone?: string | null, gymId?: string): Promise<string> {
  if (phone) {
    const adminId = getAdminMemberIdForPhone(phone);
    if (adminId) return adminId;
  }
  if (gymId) {
    return generateNextMemberCode(gymId);
  }
  return getNextSequentialMemberId();
}

/**
 * Get the next sequential member ID (e.g. MEM-610, MEM-611).
 * Queries max from externalId matching MEM-\d+, adds 1.
 * Base: 610 if no existing member numbers (MEM-001 to MEM-609 are legacy members).
 */
export async function getNextSequentialMemberId(): Promise<string> {
  const members = await prisma.member.findMany({
    where: { id: { startsWith: 'MEM-' } },
    select: { id: true },
  });
  let maxNum = 609; // Base: MEM-001 to MEM-609 are legacy members
  for (const m of members) {
    if (!m.id) continue;
    const match = m.id.match(/MEM-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `MEM-${maxNum + 1}`;
}

/**
 * Get protected member statistics
 */
export async function getProtectedMemberStats() {
  const [total, protectedCount, latestProtected] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({
      where: { id: { startsWith: 'MEM-' } },
    }),
    prisma.member.findFirst({
      where: { id: { startsWith: 'MEM-' } },
      orderBy: { id: 'desc' },
    }),
  ]);

  return {
    totalMembers: total,
    protectedMembers: protectedCount,
    nonProtectedMembers: total - protectedCount,
    latestProtected: latestProtected
      ? `${latestProtected.id} - ${latestProtected.name}`
      : 'N/A',
    protectionActive: true,
  };
}
