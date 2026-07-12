import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IMemberQueries } from "../interfaces";
import type { MemberApiDetailDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

export async function getMemberHandler(
  req: NextRequest,
  params: { id: string },
  memberQueries: IMemberQueries
): Promise<NextResponse<MemberApiDetailDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const member = await memberQueries.getMemberApiDetail(params.id, gymId);
    if (!member) {
      return ApiErrors.notFound("Member");
    }
    return NextResponse.json(member);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
