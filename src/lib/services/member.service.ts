import { prisma } from "@/lib/prisma";
import { Member, Membership, MemberStatus, Gender } from "@prisma/client";
import { revalidateTag } from "next/cache";
import {
  getMemberWithProtectionCheck,
  validateMemberFieldUpdate,
} from "@/lib/member-protection";
import {
  validateMemberDisplayName,
  validateMemberPhoneDigits,
  assertMemberStatusTransition,
} from "@/lib/crud-business-validation";

export interface UpdateMemberInput {
  name?: string;
  phone?: string;
  email?: string | null;
  gender?: Gender | null;
  dateOfBirth?: Date | null;
  address?: string | null;
  emergencyContact?: string | null;
  status?: MemberStatus;
}

export interface MemberWithMembership extends Member {
  Membership: (Membership & { Plan: { name: string; durationDays: number } })[];
}

/**
 * MEMBER SERVICE
 * 
 * Handles pure CRUD operations for members.
 * For new admissions with payment, use admission.service.ts instead.
 */
export class MemberService {
  /**
   * Check if a phone number is already registered.
   */
  static async phoneExists(
    phone: string,
    gymId: string,
    excludeMemberId?: string
  ): Promise<boolean> {
    const existing = await prisma.member.findFirst({
      where: { phone, gymId },
      select: { id: true },
    });
    
    if (!existing) return false;
    if (excludeMemberId && existing.id === excludeMemberId) return false;
    return true;
  }

  /**
   * Get member by ID with memberships.
   */
  static async getMemberById(
    id: string,
    gymId: string
  ): Promise<MemberWithMembership | null> {
    return prisma.member.findFirst({
      where: { id, gymId },
      include: {
        Membership: {
          orderBy: { startDate: "desc" },
          include: {
            Plan: {
              select: { name: true, durationDays: true },
            },
          },
        },
      },
    }) as Promise<MemberWithMembership | null>;
  }

  /**
   * Update member details.
   */
  static async updateMember(
    id: string,
    gymId: string,
    input: UpdateMemberInput
  ): Promise<Member> {
    // Get member and check member protection
    const existingMember = await getMemberWithProtectionCheck(id, "update", gymId);

    // Validate protected member field updates
    validateMemberFieldUpdate(existingMember, input as Record<string, unknown>);

    // If phone is being updated, check if it's already taken
    if (
      input.phone &&
      (await this.phoneExists(input.phone, gymId, id))
    ) {
      throw new Error("Phone number already registered");
    }

    if (input.phone) {
      validateMemberPhoneDigits(input.phone);
    }
    if (input.name) {
      validateMemberDisplayName(input.name);
    }
    if (input.status !== undefined && input.status !== existingMember.status) {
      assertMemberStatusTransition(existingMember.status, input.status);
    }

    const updated = await prisma.member.updateMany({
      where: { id, gymId },
      data: input,
    });
    if (updated.count === 0) {
      throw new Error("Member not found");
    }
    const member = await prisma.member.findFirst({
      where: { id, gymId },
    });
    if (!member) {
      throw new Error("Member not found");
    }

    // Invalidate caches
    revalidateTag("members", "max");
    revalidateTag("dashboard", "max");

    return member;
  }

  /**
   * Delete member (soft delete by setting status to EXPIRED).
   */
  static async deleteMember(id: string, gymId: string): Promise<Member> {
    const existing = await getMemberWithProtectionCheck(id, "delete", gymId);

    assertMemberStatusTransition(existing.status, MemberStatus.EXPIRED);

    const softDeleted = await prisma.member.updateMany({
      where: { id, gymId, deletedAt: null },
      data: { status: MemberStatus.EXPIRED, deletedAt: new Date() },
    });
    if (softDeleted.count === 0) {
      throw new Error("Member not found");
    }
    const member = await prisma.member.findFirst({
      where: { id, gymId },
    });
    if (!member) {
      throw new Error("Member not found");
    }

    // Invalidate caches
    revalidateTag("members", "max");
    revalidateTag("dashboard", "max");

    return member;
  }

  /**
   * List members with pagination and filters.
   * Supports both offset and cursor pagination.
   */
  static async listMembers(params: {
    gymId: string;
    search?: string;
    status?: MemberStatus;
    sortBy?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const {
      gymId,
      search,
      status,
      sortBy = "joinDate_desc",
      page,
      limit = 20,
      cursor,
    } = params;

    const where: Record<string, unknown> = { gymId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Cursor-based pagination (preferred for large datasets)
    if (cursor) {
      const members = await prisma.member.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          joinDate: true,
          Membership: {
            orderBy: { startDate: "desc" },
            take: 1,
            select: {
              endDate: true,
              Plan: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: [
          sortBy === "joinDate_asc"
            ? { joinDate: "asc" }
            : sortBy === "name_asc"
            ? { name: "asc" }
            : sortBy === "name_desc"
            ? { name: "desc" }
            : { joinDate: "desc" },
          { id: "asc" }, // Stable sort
        ],
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
        take: limit,
      });

      const hasMore = members.length === limit;
      const nextCursor = hasMore ? members[members.length - 1]?.id : undefined;

      return {
        members,
        cursor: {
          nextCursor,
          hasMore,
        },
      };
    }

    // Offset-based pagination (for backward compatibility)
    const skip = page ? (page - 1) * limit : 0;

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          joinDate: true,
          Membership: {
            orderBy: { startDate: "desc" },
            take: 1,
            select: {
              endDate: true,
              Plan: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: [
          sortBy === "joinDate_asc"
            ? { joinDate: "asc" }
            : sortBy === "name_asc"
            ? { name: "asc" }
            : sortBy === "name_desc"
            ? { name: "desc" }
            : { joinDate: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      members,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
