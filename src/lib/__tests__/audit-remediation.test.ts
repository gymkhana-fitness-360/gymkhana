import { signMemberPayToken, verifyMemberPayToken } from "@/lib/member-pay-token";
import { inferPaymentNotesMeta } from "@/domains/payments/rules";

describe("member-pay-token", () => {
  it("signs and verifies gym-bound pay links", () => {
    const gymId = "00000000-0000-4000-8000-0000000000aa";
    const memberId = "MEM-001";
    const token = signMemberPayToken(gymId, memberId);
    expect(verifyMemberPayToken(gymId, memberId, token)).toBe(true);
    expect(verifyMemberPayToken(gymId, "OTHER", token)).toBe(false);
  });
});

describe("inferPaymentNotesMeta", () => {
  it("detects PT from combined note pattern", () => {
    const meta = inferPaymentNotesMeta("membership 700+1800 PT", 700);
    expect(meta?.isPersonalTrainer).toBe(true);
  });
});
