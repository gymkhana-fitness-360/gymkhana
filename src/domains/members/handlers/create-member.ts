import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IMemberService } from "../interfaces";
import type { CreateMemberInput, MemberDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const createMemberBodySchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergencyContact: z.string().max(100).optional().nullable(),
});

export async function createMemberHandler(
  req: NextRequest,
  memberService: IMemberService
): Promise<NextResponse<MemberDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    if (!memberService.createMember) {
      return NextResponse.json(
        { error: "Member creation is not available for this adapter." },
        { status: 501 }
      );
    }
    const json = await req.json().catch(() => null);
    const parsed = createMemberBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const input: CreateMemberInput = {
      gymId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email === "" ? null : parsed.data.email ?? null,
      gender: parsed.data.gender ?? null,
      dateOfBirth: parsed.data.dateOfBirth ?? null,
      address: parsed.data.address ?? null,
      emergencyContact: parsed.data.emergencyContact ?? null,
    };
    const member = await memberService.createMember(input);
    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
