import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function sendMemberOtp(gymId: string, phone: string) {
  const normalized = normalizePhone(phone);
  const member = await prisma.member.findFirst({
    where: { gymId, phone: { endsWith: normalized } },
    select: { id: true, phone: true },
  });
  if (!member) {
    return { ok: false as const, error: "member_not_found" };
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.memberOtpChallenge.deleteMany({
    where: { gymId, phone: normalized },
  });

  await prisma.memberOtpChallenge.create({
    data: {
      gymId,
      phone: normalized,
      codeHash: hashCode(code),
      memberId: member.id,
      expiresAt,
    },
  });

  // Only expose the code locally. A non-prod *staging* deploy must NOT leak it.
  const isLocalDev = process.env.NODE_ENV === "development";
  if (isLocalDev) {
    console.info(`[member-otp] gym=${gymId} phone=${normalized} code=${code}`);
  }

  return {
    ok: true as const,
    memberId: member.id,
    expiresAt: expiresAt.toISOString(),
    ...(isLocalDev ? { devCode: code } : {}),
  };
}

export async function verifyMemberOtp(
  gymId: string,
  phone: string,
  code: string,
) {
  const normalized = normalizePhone(phone);
  const challenge = await prisma.memberOtpChallenge.findFirst({
    where: { gymId, phone: normalized },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || challenge.expiresAt < new Date()) {
    return { ok: false as const, error: "expired_or_missing" };
  }

  if (challenge.codeHash !== hashCode(code)) {
    return { ok: false as const, error: "invalid_code" };
  }

  await prisma.memberOtpChallenge.delete({ where: { id: challenge.id } });

  return {
    ok: true as const,
    memberId: challenge.memberId!,
    gymId,
  };
}
