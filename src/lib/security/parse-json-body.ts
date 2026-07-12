import { z } from "zod";
import { ApiErrors } from "@/lib/api-response";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

export type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<ParseJsonResult<z.infer<T>>> {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: ApiErrors.validationError("Validation failed", parsed.error.issues),
    };
  }
  return { ok: true, data: parsed.data };
}
