import { prisma } from "@/lib/prisma";
import { memberBelongsToGym } from "@/lib/gym-scope";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    member: {
      findFirst: jest.fn(),
    },
  },
}));

describe("memberBelongsToGym", () => {
  it("returns true when member exists in gym", async () => {
    (prisma.member.findFirst as jest.Mock).mockResolvedValue({ id: "m1" });
    const gymId = "00000000-0000-4000-8000-000000000001";
    await expect(memberBelongsToGym("m1", gymId)).resolves.toBe(true);
    expect(prisma.member.findFirst).toHaveBeenCalledWith({
      where: { id: "m1", gymId },
      select: { id: true },
    });
  });

  it("returns false when member is in another gym", async () => {
    (prisma.member.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      memberBelongsToGym("m1", "00000000-0000-4000-8000-000000000002"),
    ).resolves.toBe(false);
  });
});
