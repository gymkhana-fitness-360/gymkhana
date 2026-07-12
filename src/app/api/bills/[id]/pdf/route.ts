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
import { WORKOUT_PLANS } from "@/domains/billing/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected.");

  const { id } = await params;
  const bill = await prisma.bill.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      Member: { select: { id: true, name: true, phone: true } },
      Gym: { select: { name: true, address: true, phone: true, currencyCode: true } },
      InvoiceTransaction: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!bill) return ApiErrors.notFound("Bill");

  if (!resourceBelongsToGym(bill, gymId)) return ApiErrors.notFound("Bill");

  const workoutPlan = (() => {
    try {
      return JSON.parse(bill.workoutPlan);
    } catch {
      return WORKOUT_PLANS[bill.programType as keyof typeof WORKOUT_PLANS];
    }
  })();

  const total = Number(bill.subscriptionFee ?? bill.amount ?? 0) + Number(bill.tax ?? 0) - Number(bill.discountAmount ?? 0);
  const symbol = bill.Gym.currencyCode === "USD" ? "$" : "₹";

  const lines = [
    `Invoice ${bill.billNumber}`,
    `Gym: ${bill.Gym.name}`,
    `Member: ${bill.Member.name} (${bill.Member.id})`,
    `Status: ${bill.status}`,
    `Period: ${bill.validFrom.toISOString().split("T")[0]} – ${bill.validTo.toISOString().split("T")[0]}`,
    `Subtotal: ${symbol}${Number(bill.subscriptionFee ?? bill.amount ?? 0)}`,
    `Tax: ${symbol}${Number(bill.tax ?? 0)}`,
    `Discount: ${symbol}${Number(bill.discountAmount ?? 0)}`,
    `Total: ${symbol}${total}`,
    `Paid: ${symbol}${Number(bill.paidAmount)}`,
    `Due: ${symbol}${Number(bill.dueAmount)}`,
    "",
    "Workout plan:",
    ...(Array.isArray(workoutPlan) ? workoutPlan.map((w: string) => `- ${w}`) : []),
  ];

  const pdfBody = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${lines.join("\\n").length + 50}>>stream
BT /F1 12 Tf 50 740 Td (${lines.join(") Tj T* (")}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000270 00000 n 
0000000500 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
580
%%EOF`;

  return new NextResponse(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bill.billNumber}.pdf"`,
    },
  });
}
