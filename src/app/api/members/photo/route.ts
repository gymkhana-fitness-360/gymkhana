import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { uploadMemberPhotoHandler } from "@/domains/members/handlers/member-photo";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return uploadMemberPhotoHandler(request);
}
