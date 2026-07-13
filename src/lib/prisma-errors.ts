import { Prisma } from "@prisma/client";
import type { NextResponse } from "next/server";
import { ApiErrors } from "@/lib/api-handler";

/** Map known Prisma request errors to API responses; return null if not applicable. */
export function mapPrismaKnownError(error: unknown): NextResponse | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }
  if (error.code === "P2002") {
    return ApiErrors.duplicate("A record with this value already exists");
  }
  if (error.code === "P2025") {
    return ApiErrors.notFound("Record");
  }
  return null;
}
