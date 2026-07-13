import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { createLogger } from "@/lib/logger";

const logger = createLogger("billing-templates");

/** Get all active bill templates. */
export async function listBillTemplatesHandler() {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const templates = await prisma.receiptTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error("[listBillTemplatesHandler]", error as Error);
    return ApiErrors.internal("Failed to fetch templates");
  }
}
