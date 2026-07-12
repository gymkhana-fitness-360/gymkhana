import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IMemberService } from "../interfaces";
import type { MemberDTO, MemberStatusValue, UpdateMemberInput } from "../types";
import { ApiErrors, getErrorMessage } from "@/lib/api-handler";
import { MemberProtectionError, logMemberModification } from "@/lib/member-protection";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";

const updateMemberBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergencyContact: z.string().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED"]).optional(),
});

export async function updateMemberHandler(
  req: NextRequest,
  params: { id: string },
  memberService: IMemberService,
): Promise<NextResponse<MemberDTO | { error: string }>> {
  try {
    const ctx = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = updateMemberBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }

    const before = await memberService.getMemberById(params.id, ctx.gymId);
    if (!before) return ApiErrors.notFound("Member");

    const data = parsed.data;
    const input: UpdateMemberInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && {
        email: data.email === "" ? null : data.email,
      }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.emergencyContact !== undefined && {
        emergencyContact: data.emergencyContact,
      }),
      ...(data.status !== undefined && { status: data.status as MemberStatusValue }),
    };

    const member = await memberService.updateMember(params.id, ctx.gymId, input);

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(input) as (keyof UpdateMemberInput)[]) {
      const oldVal = (before as unknown as Record<string, unknown>)[key];
      const newVal = (member as unknown as Record<string, unknown>)[key];
      if (oldVal !== newVal) changes[key] = { old: oldVal, new: newVal };
    }
    if (Object.keys(changes).length > 0) {
      await logMemberModification({
        memberId: member.id,
        memberExternalId: member.id,
        memberName: member.name,
        operation: "update",
        userId: ctx.userId,
        userName: "Staff",
        timestamp: new Date(),
        changes,
      });
    }

    return NextResponse.json(member);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof MemberProtectionError) {
      return ApiErrors.forbidden(getErrorMessage(e));
    }
    if (e instanceof BusinessRuleViolation) {
      return ApiErrors.businessRule(e.message, e.code);
    }
    if (e instanceof Error) {
      if (e.message === "Member not found") return ApiErrors.notFound("Member");
      if (e.message.includes("Phone number already")) {
        return ApiErrors.validationError(e.message);
      }
      if (e.message.includes("Invalid status") || e.message.includes("transition")) {
        return ApiErrors.validationError(e.message);
      }
    }
    throw e;
  }
}
