import { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayIST, addDaysIST } from "@/lib/date-only";

export type CampaignSegment =
  | "expiring_this_week"
  | "overdue"
  | "lapsed_30d"
  | "all_active";

export type CampaignProbeResult = {
  segment: CampaignSegment;
  audienceCount: number;
  sample: Array<{ id: string; name: string; phone: string | null }>;
  analytics: {
    withPhone: number;
    activeMembers: number;
    expiringIn7Days: number;
    overdueCount: number;
  };
};

async function membersForSegment(gymId: string, segment: CampaignSegment) {
  const today = todayIST();
  const in7 = addDaysIST(today, 7);
  const thirtyAgo = addDaysIST(today, -30);

  switch (segment) {
    case "expiring_this_week":
      return prisma.member.findMany({
        where: {
          gymId,
          status: MemberStatus.ACTIVE,
          nextRenewalDate: { gte: today, lte: in7 },
        },
        select: { id: true, name: true, phone: true, status: true, nextRenewalDate: true },
        take: 5000,
      });
    case "overdue":
      return prisma.member.findMany({
        where: {
          gymId,
          status: { in: [MemberStatus.ACTIVE, MemberStatus.EXPIRED] },
          nextRenewalDate: { lte: today, gte: thirtyAgo },
        },
        select: { id: true, name: true, phone: true, status: true, nextRenewalDate: true },
        take: 5000,
      });
    case "lapsed_30d":
      return prisma.member.findMany({
        where: {
          gymId,
          status: MemberStatus.EXPIRED,
          nextRenewalDate: { lt: thirtyAgo },
        },
        select: { id: true, name: true, phone: true, status: true, nextRenewalDate: true },
        take: 5000,
      });
    case "all_active":
    default:
      return prisma.member.findMany({
        where: { gymId, status: MemberStatus.ACTIVE },
        select: { id: true, name: true, phone: true, status: true, nextRenewalDate: true },
        take: 5000,
      });
  }
}

export async function probeCampaignAudience(
  gymId: string,
  segment: CampaignSegment,
): Promise<CampaignProbeResult> {
  const members = await membersForSegment(gymId, segment);
  const withPhone = members.filter((m) => m.phone?.trim()).length;
  const today = todayIST();
  const in7 = addDaysIST(today, 7);

  const [activeMembers, expiringIn7Days, overdueCount] = await Promise.all([
    prisma.member.count({ where: { gymId, status: MemberStatus.ACTIVE } }),
    prisma.member.count({
      where: { gymId, status: MemberStatus.ACTIVE, nextRenewalDate: { gte: today, lte: in7 } },
    }),
    prisma.member.count({
      where: {
        gymId,
        status: { in: [MemberStatus.ACTIVE, MemberStatus.EXPIRED] },
        nextRenewalDate: { lte: today },
      },
    }),
  ]);

  return {
    segment,
    audienceCount: members.length,
    sample: members.slice(0, 8).map((m) => ({ id: m.id, name: m.name, phone: m.phone })),
    analytics: { withPhone, activeMembers, expiringIn7Days, overdueCount },
  };
}

export async function createCampaignDraft(input: {
  gymId: string;
  name: string;
  message: string;
  segment: CampaignSegment;
  templateId?: string;
  analytics: CampaignProbeResult;
}) {
  return prisma.whatsAppCampaign.create({
    data: {
      gymId: input.gymId,
      name: input.name,
      message: input.message,
      segment: { type: input.segment },
      analytics: input.analytics,
      templateId: input.templateId,
      recipientCount: input.analytics.audienceCount,
      status: "DRAFT",
    },
  });
}

export async function queueCampaignSend(gymId: string, campaignId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, gymId },
  });
  if (!campaign) throw new Error("Campaign not found");
  return prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: { status: "QUEUED", payload: { queuedAt: new Date().toISOString() } },
  });
}
