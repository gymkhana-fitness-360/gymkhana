import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { AppValidator } from "@/lib/validate";

export const GET = createApiHandler(
  async () => {
    const validator = new AppValidator();
    const report = await validator.validate();
    return NextResponse.json(report);
  },
  { rateLimit: "lenient" },
);
