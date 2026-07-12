import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  billCodePrefixKey,
  chargeAdmissionFeeKey,
  chargeDiscountPresetsKey,
  chargeTaxPercentKey,
  memberCodePrefixKey,
  memberCodeSequenceKey,
} from "@/lib/gym-settings/keys";

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  financialYearStart: z.string().optional().nullable(),
  financialYearEnd: z.string().optional().nullable(),
  currencyCode: z.string().min(3).max(3).optional(),
  memberCodePrefix: z.string().optional(),
  billCodePrefix: z.string().optional(),
  chargeAdmissionFee: z.number().min(0).optional(),
  chargeTaxPercent: z.number().min(0).max(100).optional(),
  chargeDiscountPresets: z.array(z.number().min(0)).optional(),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) return ApiErrors.notFound("Gym");

  const keys = [
    memberCodePrefixKey(gymId),
    billCodePrefixKey(gymId),
    chargeAdmissionFeeKey(gymId),
    chargeTaxPercentKey(gymId),
    chargeDiscountPresetsKey(gymId),
  ];
  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return NextResponse.json({
    ...gym,
    memberCodePrefix: map[memberCodePrefixKey(gymId)] ?? "MEM-",
    billCodePrefix: map[billCodePrefixKey(gymId)] ?? "GK-",
    chargeAdmissionFee: parseFloat(map[chargeAdmissionFeeKey(gymId)] ?? "0"),
    chargeTaxPercent: parseFloat(map[chargeTaxPercentKey(gymId)] ?? "0"),
    chargeDiscountPresets: (() => {
      const raw = map[chargeDiscountPresetsKey(gymId)];
      if (!raw) return [];
      try {
        return JSON.parse(raw) as number[];
      } catch {
        return [];
      }
    })(),
  });
}

export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin required");

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, profileSchema);
  if (!parsed.ok) return parsed.response;

  const d = parsed.data;
  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.address !== undefined && { address: d.address }),
      ...(d.phone !== undefined && { phone: d.phone }),
      ...(d.email !== undefined && { email: d.email }),
      ...(d.logoUrl !== undefined && { logoUrl: d.logoUrl }),
      ...(d.currencyCode !== undefined && { currencyCode: d.currencyCode.toUpperCase() }),
      ...(d.financialYearStart !== undefined && {
        financialYearStart: d.financialYearStart ? new Date(d.financialYearStart) : null,
      }),
      ...(d.financialYearEnd !== undefined && {
        financialYearEnd: d.financialYearEnd ? new Date(d.financialYearEnd) : null,
      }),
    },
  });

  const settingUpserts: Array<{ key: string; value: string }> = [];
  if (d.memberCodePrefix !== undefined) {
    settingUpserts.push({ key: memberCodePrefixKey(gymId), value: d.memberCodePrefix });
  }
  if (d.billCodePrefix !== undefined) {
    settingUpserts.push({ key: billCodePrefixKey(gymId), value: d.billCodePrefix });
  }
  if (d.chargeAdmissionFee !== undefined) {
    settingUpserts.push({
      key: chargeAdmissionFeeKey(gymId),
      value: String(d.chargeAdmissionFee),
    });
  }
  if (d.chargeTaxPercent !== undefined) {
    settingUpserts.push({
      key: chargeTaxPercentKey(gymId),
      value: String(d.chargeTaxPercent),
    });
  }
  if (d.chargeDiscountPresets !== undefined) {
    settingUpserts.push({
      key: chargeDiscountPresetsKey(gymId),
      value: JSON.stringify(d.chargeDiscountPresets),
    });
  }

  for (const { key, value } of settingUpserts) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  return NextResponse.json(gym);
}
