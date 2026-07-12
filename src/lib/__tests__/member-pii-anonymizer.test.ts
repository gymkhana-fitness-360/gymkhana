jest.mock("@faker-js/faker", () => {
  let numericCall = 0;
  return {
    faker: {
      seed: jest.fn(),
      string: {
        numeric: (n: number) => {
          numericCall += 1;
          return String(numericCall).padStart(n, "0").slice(-n);
        },
      },
      helpers: {
        arrayElement: <T,>(arr: readonly T[]) => arr[0] as T,
      },
      person: {
        firstName: () => "Alex",
        lastName: () => "Sample",
      },
      location: {
        streetAddress: () => "1 Anonymized Street, Sample City",
      },
      datatype: {
        boolean: () => true,
      },
      date: {
        birthdate: () => new Date("1995-06-15T00:00:00.000Z"),
      },
    },
  };
});

import {
  allocatePhoneSwapBuffers,
  anonymizeAllMemberPii,
  digitsOnlyLength,
  sanitizeAuditDetailsJson,
  takeUniqueFakePhone,
} from "../../../scripts/lib/member-pii-anonymizer";

describe("sanitizeAuditDetailsJson", () => {
  it("redacts known PII keys and recurses", () => {
    const input = {
      action: "member_created",
      name: "Real Person",
      nested: { phone: "+919999999999", keep: 1 },
    };
    const out = sanitizeAuditDetailsJson(input) as Record<string, unknown>;
    expect(out.name).toBe("REDACTED");
    expect((out.nested as Record<string, unknown>).phone).toBe("REDACTED");
    expect((out.nested as Record<string, unknown>).keep).toBe(1);
    expect(out.action).toBe("member_created");
  });
});

describe("digitsOnlyLength", () => {
  it("counts digits only", () => {
    expect(digitsOnlyLength("+91 98765-43210")).toBe(12);
    expect(digitsOnlyLength("9876543210")).toBe(10);
  });
});

describe("takeUniqueFakePhone", () => {
  it("produces 10–15 digits and unique values", () => {
    const used = new Set<string>();
    const phones = Array.from({ length: 50 }, () => takeUniqueFakePhone(used));
    expect(new Set(phones).size).toBe(50);
    for (const p of phones) {
      const len = digitsOnlyLength(p);
      expect(len).toBeGreaterThanOrEqual(10);
      expect(len).toBeLessThanOrEqual(15);
    }
  });
});

describe("allocatePhoneSwapBuffers", () => {
  it("keeps intermediate and final disjoint from existing and from each other", () => {
    const existing = ["+919000000001", "+919000000002"];
    const rng = { takeUnique: takeUniqueFakePhone };
    const { intermediate, final } = allocatePhoneSwapBuffers(existing, 5, rng);
    const all = new Set([...existing, ...intermediate, ...final]);
    expect(all.size).toBe(existing.length + intermediate.length + final.length);
    expect(intermediate.some((p) => final.includes(p))).toBe(false);
  });
});

describe("anonymizeAllMemberPii", () => {
  it("dry-run does not call $transaction", async () => {
    const prisma = {
      member: {
        findMany: jest.fn().mockResolvedValue([{ id: "MEM-1", phone: "+919111111111" }]),
      },
      $transaction: jest.fn(),
    };
    const result = await anonymizeAllMemberPii(prisma as never, { dryRun: true, fakerSeed: 1 });
    expect(result.membersProcessed).toBe(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("no members returns zero counts", async () => {
    const prisma = {
      member: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };
    const result = await anonymizeAllMemberPii(prisma as never, { dryRun: false });
    expect(result.membersProcessed).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
