import { prisma } from "@/lib/prisma";
import { detectOverdueMembers } from "@/domains/collections/services/overdue.service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    member: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe("detectOverdueMembers", () => {
  it("scopes queries by gymId", async () => {
    const gymId = "00000000-0000-4000-8000-000000000099";
    await detectOverdueMembers(gymId);
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gymId }),
      }),
    );
  });
});
