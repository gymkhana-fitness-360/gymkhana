import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { createMemberSchema } from "@/lib/validators";
import { ApiErrors } from "@/lib/api-handler";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";
import { admitMemberWithPayment, AdmitMemberError } from "../services/admit-member-with-payment";
import type { MemberApiDetailDTO } from "../types";
import { publishDomainEvent } from "@/lib/platform/outbox";

export async function admitMemberHandler(
  req: NextRequest
): Promise<NextResponse<MemberApiDetailDTO | { error: string }>> {
  try {
    const { gymId, userId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const validated = createMemberSchema.parse(json);
    const body = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const member = await admitMemberWithPayment(
      {
        ...validated,
        admissionFee: body.admissionFee as number | string | undefined,
        personalTrainingFee: body.personalTrainingFee as number | string | undefined,
      },
      { gymId, userId }
    );
    await publishDomainEvent(
      "member.created",
      { memberId: member.id, name: member.name },
      gymId,
    );
    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof z.ZodError) {
      return ApiErrors.validationError("Validation failed", e.issues);
    }
    if (e instanceof AdmitMemberError) {
      if (e.code === "DUPLICATE_PHONE") {
        return ApiErrors.validationError(e.message);
      }
      return ApiErrors.validationError(e.message);
    }
    if (e instanceof BusinessRuleViolation) {
      if (e.code === "PAYMENT_DUPLICATE") {
        try {
          const duplicateData = JSON.parse(e.message);
          return NextResponse.json(
            {
              error: "PAYMENT_DUPLICATE",
              message: duplicateData.message,
              existingPayment: duplicateData.existingPayment,
              canOverride: duplicateData.canOverride,
            },
            { status: 409 }
          );
        } catch {
          return NextResponse.json(
            {
              error: "PAYMENT_DUPLICATE",
              message: "Possible duplicate payment detected",
              canOverride: true,
            },
            { status: 409 }
          );
        }
      }
      return ApiErrors.businessRule(e.message, e.code);
    }
    throw e;
  }
}
