import type { ZodSchema } from "zod";
import { ApiErrors } from "@/lib/api-response";
import { parseBodyWithLimit } from "@/lib/api-response";
import type { NextResponse } from "next/server";

/**
 * Parse JSON body with size limit and Zod validation (injection-safe typed input).
 */
export async function parseValidatedBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; error: NextResponse }> {
  const parsed = await parseBodyWithLimit(request);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const result = schema.safeParse(parsed.body);
  if (!result.success) {
    return {
      ok: false,
      error: ApiErrors.validationError("Invalid request body", result.error.flatten()),
    };
  }

  return { ok: true, data: result.data };
}
