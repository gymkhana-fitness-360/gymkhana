import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { resourceBelongsToGym } from "@/domains/tenancy";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";
import { ExpenseStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, gymId: true },
  });
  if (!resourceBelongsToGym(existing, gymId)) {
    return ApiErrors.notFound("Expense");
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: ExpenseStatus.PAID,
      paidAt: new Date(),
      paymentDate: new Date(),
    },
  });

  return NextResponse.json(expense);
}
