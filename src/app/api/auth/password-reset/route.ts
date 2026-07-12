import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { sendTransactionalEmail } from "@/lib/email/send";

import { findUserByLoginIdentifier } from "@/lib/auth/provision-owner";

const requestSchema = z.object({
  contactNumber: z.string().min(3),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) return parsed.response;

  const user = await findUserByLoginIdentifier(parsed.data.contactNumber);

  // Always return success to avoid user enumeration
  if (!user || !user.isActive) {
    return NextResponse.json({ success: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendTransactionalEmail({
    to: user.email ?? (user.contactNumber.includes("@") ? user.contactNumber : undefined),
    subject: "Reset your Fitness360 password",
    text: `Use this link to reset your password (valid 1 hour): ${resetUrl}`,
  }).catch(() => {});

  return NextResponse.json({ success: true, ...(process.env.NODE_ENV === "development" && { resetUrl }) });
}

export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const parsed = await parseJsonBody(request, resetSchema);
  if (!parsed.ok) return parsed.response;

  const tokenHash = hashToken(parsed.data.token);
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) return ApiErrors.validationError("Invalid or expired reset token");

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash, mustChangePassword: false, lastPasswordChange: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
