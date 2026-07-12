import { prisma } from "@/lib/prisma";
import { excludeTestUsers } from "@/lib/test-users";
import type { Member, MemberStatus, Prisma } from "@prisma/client";
import type { IMemberQueries } from "../interfaces";
import type {
  ListMembersParams,
  ListMembersResultDTO,
  MemberApiDetailDTO,
  MemberDetailDTO,
  MemberListItemDTO,
  MemberMembershipRowDTO,
  MemberMembershipSummaryDTO,
  MemberPlanSummaryDTO,
} from "../types";
import { memberApiDetailInclude } from "../types";

type MemberListRow = {
  id: string;
  name: string;
  phone: string;
  status: MemberStatus;
  joinDate: Date;
  Membership: {
    endDate: Date;
    amount: unknown;
    Plan: { name: string };
  }[];
};

type MemberDetailRow = Member & {
  Membership: (Prisma.MembershipGetPayload<{
    include: { Plan: { select: { name: true; durationDays: true } } };
  }>)[];
};

export class PrismaMemberQueries implements IMemberQueries {
  async phoneExists(
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

  async getMemberApiDetail(
    id: string,
    gymId: string
  ): Promise<MemberApiDetailDTO | null> {
    return prisma.member.findFirst({
      where: { id, gymId, deletedAt: null },
      include: memberApiDetailInclude,
    });
  }

  async getMemberById(id: string, gymId: string): Promise<MemberDetailDTO | null> {
    const row = await prisma.member.findFirst({
      where: { id, gymId, deletedAt: null },
      include: {
        Membership: {
          orderBy: { startDate: "desc" },
          include: {
            Plan: { select: { name: true, durationDays: true } },
          },
        },
      },
    });
    return row ? this.toDetailDTO(row as MemberDetailRow) : null;
  }

  async listMembers(params: ListMembersParams): Promise<ListMembersResultDTO> {
    const {
      gymId,
      search,
      status,
      expiryFilter,
      excludeTestUsers: excludeTest = true,
      sortBy = "joinDate_desc",
      page,
      limit = 20,
      cursor,
    } = params;

    const where: Prisma.MemberWhereInput = {
      gymId,
      deletedAt: null,
      ...(excludeTest ? excludeTestUsers : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status as MemberStatus;
    }

    if (expiryFilter) {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      if (expiryFilter === "expired_7") {
        const from = new Date(todayStart);
        from.setDate(from.getDate() - 7);
        where.Membership = {
          some: { endDate: { gte: from, lt: todayStart } },
        };
      } else if (expiryFilter === "expired_30") {
        const from = new Date(todayStart);
        from.setDate(from.getDate() - 30);
        where.Membership = {
          some: { endDate: { gte: from, lt: todayStart } },
        };
      } else if (expiryFilter === "expires_7") {
        const to = new Date(todayStart);
        to.setDate(to.getDate() + 7);
        to.setHours(23, 59, 59, 999);
        where.Membership = {
          some: { endDate: { gte: todayStart, lte: to } },
        };
      } else if (expiryFilter === "expires_30") {
        const to = new Date(todayStart);
        to.setDate(to.getDate() + 30);
        to.setHours(23, 59, 59, 999);
        where.Membership = {
          some: { endDate: { gte: todayStart, lte: to } },
        };
      }
    }

    const orderBy: Prisma.MemberOrderByWithRelationInput[] = [
      sortBy === "joinDate_asc"
        ? { joinDate: "asc" }
        : sortBy === "name_asc"
          ? { name: "asc" }
          : sortBy === "name_desc"
            ? { name: "desc" }
            : { joinDate: "desc" },
      { id: "asc" },
    ];

    const select = {
      id: true,
      name: true,
      phone: true,
      status: true,
      joinDate: true,
      Membership: {
        orderBy: { endDate: "desc" as const },
        take: 1,
        select: {
          endDate: true,
          amount: true,
          Plan: { select: { name: true } },
        },
      },
    } satisfies Prisma.MemberSelect;

    if (cursor) {
      const members = await prisma.member.findMany({
        where,
        select,
        orderBy,
        cursor: { id: cursor },
        skip: 1,
        take: limit,
      });

      const hasMore = members.length === limit;
      const nextCursor = hasMore ? members[members.length - 1]?.id : undefined;

      return {
        members: members.map((m) => this.toListItemDTO(m as MemberListRow)),
        cursor: { nextCursor, hasMore },
      };
    }

    const skip = page ? (page - 1) * limit : 0;

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select,
        orderBy: [
          ...orderBy,
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      members: members.map((m) => this.toListItemDTO(m as MemberListRow)),
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toListItemDTO(m: MemberListRow): MemberListItemDTO {
    const latest = m.Membership[0];
    let latestMembership: MemberMembershipSummaryDTO | null = null;
    if (latest) {
      latestMembership = {
        endDate: latest.endDate,
        planName: latest.Plan.name,
        amount: Number(latest.amount),
      };
    }
    return {
      id: m.id,
      name: m.name,
      phone: m.phone,
      status: m.status,
      joinDate: m.joinDate,
      latestMembership,
    };
  }

  private toDetailDTO(row: MemberDetailRow): MemberDetailDTO {
    const memberships: MemberMembershipRowDTO[] = row.Membership.map((mem) => {
      const plan: MemberPlanSummaryDTO = {
        name: mem.Plan.name,
        durationDays: mem.Plan.durationDays,
      };
      return {
        id: mem.id,
        startDate: mem.startDate,
        endDate: mem.endDate,
        plan,
      };
    });

    return {
      id: row.id,
      gymId: row.gymId,
      name: row.name,
      phone: row.phone,
      email: row.email ?? null,
      gender: row.gender ?? null,
      dateOfBirth: row.dateOfBirth,
      address: row.address,
      emergencyContact: row.emergencyContact,
      status: row.status,
      joinDate: row.joinDate,
      source: row.source ?? null,
      goal: row.goal ?? null,
      healthIssue: row.healthIssue ?? null,
      country: row.country ?? null,
      state: row.state ?? null,
      city: row.city ?? null,
      pincode: row.pincode ?? null,
      photo: row.photo ?? null,
      memberships,
    };
  }
}
