import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  createClassBookingHandler,
  listClassBookingsHandler,
} from "@/domains/classes/handlers/class-bookings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  const { id: classId } = await params;
  return createClassBookingHandler(request, classId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const { id: classId } = await params;
  return listClassBookingsHandler(request, classId);
}
