import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";

const querySchema = z.object({
  memberId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listBillsHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(req);
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid query parameters", parsed.error.issues);
    }

    const bills = await prisma.bill.findMany({
      where: {
        gymId,
        deletedAt: null,
        ...(parsed.data.memberId ? { memberId: parsed.data.memberId } : {}),
      },
      include: {
        Member: { select: { id: true, name: true, phone: true } },
        User: { select: { name: true } },
        InvoiceTransaction: { orderBy: { occurredAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit ?? 100,
    });

    return NextResponse.json(bills);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
