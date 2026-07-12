import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseQueryParams } from "@/domains/kernel";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IMemberQueries } from "../interfaces";
import type {
  ListMembersResultDTO,
  MemberExpiryFilterValue,
  MemberStatusValue,
} from "../types";
import { ApiErrors } from "@/lib/api-handler";
import { MemberStatus } from "@prisma/client";

const statusQuerySchema = z.nativeEnum(MemberStatus).optional();

const expiryFilterSchema = z
  .enum(["expired_7", "expired_30", "expires_7", "expires_30"])
  .optional()
  .transform((v) => v as MemberExpiryFilterValue | undefined);

export async function listMembersHandler(
  req: NextRequest,
  memberQueries: IMemberQueries
): Promise<NextResponse<ListMembersResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const { page, limit, search, sortBy } = parseQueryParams(req, {
      defaultLimit: 20,
      maxLimit: 200,
    });
    const sp = req.nextUrl.searchParams;
    const statusRaw = sp.get("status");
    const statusParsed = statusQuerySchema.safeParse(statusRaw ?? undefined);
    if (!statusParsed.success) {
      return ApiErrors.validationError("Invalid query parameters", statusParsed.error.issues);
    }
    const expiryParsed = expiryFilterSchema.safeParse(
      sp.get("expiryFilter") ?? undefined
    );
    if (!expiryParsed.success) {
      return ApiErrors.validationError("Invalid query parameters", expiryParsed.error.issues);
    }
    const sortByResolved = sortBy ?? "joinDate_desc";
    const result = await memberQueries.listMembers({
      gymId,
      page,
      limit,
      search,
      sortBy: sortByResolved,
      status: statusParsed.data as MemberStatusValue | undefined,
      expiryFilter: expiryParsed.data,
      excludeTestUsers: true,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
