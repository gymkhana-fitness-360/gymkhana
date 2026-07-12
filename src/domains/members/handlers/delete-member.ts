import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IMemberService } from "../interfaces";
import type { MemberDTO } from "../types";
import { ApiErrors, getErrorMessage } from "@/lib/api-handler";
import { MemberProtectionError } from "@/lib/member-protection";
import { logMemberModification } from "@/lib/member-protection";

export async function deleteMemberHandler(
  req: NextRequest,
  params: { id: string },
  memberService: IMemberService,
): Promise<NextResponse<MemberDTO | { message: string } | { error: string }>> {
  try {
    const ctx = await getGymContext(req);
    const existing = await memberService.getMemberById(params.id, ctx.gymId);
    if (!existing) {
      return ApiErrors.notFound("Member");
    }

    const member = await memberService.deleteMember(params.id, ctx.gymId);

    await logMemberModification({
      memberId: member.id,
      memberExternalId: member.id,
      memberName: member.name,
      operation: "delete",
      userId: ctx.userId,
      userName: "Staff",
      timestamp: new Date(),
    });

    return NextResponse.json({ message: "Member deleted successfully" });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof MemberProtectionError) {
      return ApiErrors.forbidden(getErrorMessage(e));
    }
    if (e instanceof Error && e.message.includes("Invalid status")) {
      return ApiErrors.validationError(e.message);
    }
    if (e instanceof Error && e.message === "Member not found") {
      return ApiErrors.notFound("Member");
    }
    throw e;
  }
}
