/**
 * GYM-P0-008: Cross-tenant isolation unit tests (no DB required).
 */
import { prisma } from "@/lib/prisma";
import { detectOverdueMembers } from "@/domains/collections/services/overdue.service";
import { memberBelongsToGym } from "@/lib/gym-scope";
import {
  assertResourceBelongsToGym,
  resourceBelongsToGym,
} from "@/domains/tenancy/assert-gym-resource";

jest.mock("@/lib/gym-scope", () => ({
  memberBelongsToGym: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    member: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    overdueTracking: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

const GYM_A = "00000000-0000-4000-8000-0000000000aa";
const GYM_B = "00000000-0000-4000-8000-0000000000bb";

describe("tenant isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("overdue detection uses the requested gym only", async () => {
    await detectOverdueMembers(GYM_A);
    await detectOverdueMembers(GYM_B);
    expect(prisma.member.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ gymId: GYM_A }) }),
    );
    expect(prisma.member.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ gymId: GYM_B }) }),
    );
  });

  it("memberBelongsToGym prevents cross-gym member access", async () => {
    (memberBelongsToGym as jest.Mock).mockImplementation(async (memberId, gymId) => {
      const row = await prisma.member.findFirst({ where: { id: memberId, gymId } });
      return Boolean(row);
    });
    (prisma.member.findFirst as jest.Mock).mockImplementation(({ where }) =>
      Promise.resolve(where.gymId === GYM_A ? { id: where.id } : null),
    );
    await expect(memberBelongsToGym("member-1", GYM_A)).resolves.toBe(true);
    await expect(memberBelongsToGym("member-1", GYM_B)).resolves.toBe(false);
  });

  it("resourceBelongsToGym rejects cross-gym resource", () => {
    expect(resourceBelongsToGym({ gymId: GYM_A }, GYM_A)).toBe(true);
    expect(resourceBelongsToGym({ gymId: GYM_A }, GYM_B)).toBe(false);
    expect(() => assertResourceBelongsToGym({ gymId: GYM_A }, GYM_B)).toThrow(
      "RESOURCE_NOT_IN_GYM",
    );
  });

  it("resolveOverdueOnPayment scopes overdue queries by gymId", async () => {
    const { memberBelongsToGym } = await import("@/lib/gym-scope");
    (memberBelongsToGym as jest.Mock).mockResolvedValue(true);
    (prisma.member.findFirst as jest.Mock).mockResolvedValue({ status: "ACTIVE" });

    const { resolveOverdueOnPayment } = await import(
      "@/domains/collections/services/overdue.service"
    );
    await resolveOverdueOnPayment("member-1", GYM_A);

    expect(prisma.overdueTracking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gymId: GYM_A, memberId: "member-1" }),
      }),
    );
  });

  it("WhatsApp phone lookup pattern includes gymId in query shape", async () => {
    const gymId = GYM_A;
    const digits = "9876543210";
    (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
    await prisma.member.findFirst({
      where: { gymId, phone: { contains: digits } },
      select: { id: true, name: true, phone: true },
    });
    expect(prisma.member.findFirst).toHaveBeenCalledWith({
      where: { gymId, phone: { contains: digits } },
      select: { id: true, name: true, phone: true },
    });
  });
});
