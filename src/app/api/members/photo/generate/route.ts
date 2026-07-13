import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { generateMemberPhotoHandler } from "@/domains/members/handlers/member-photo-generate";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return generateMemberPhotoHandler(request);
}
