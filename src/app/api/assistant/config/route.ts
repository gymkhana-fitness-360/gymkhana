import { NextResponse } from "next/server";
import {
  FITNESS360_AI_DEFAULT_MODEL,
  resolveServerApiKey,
  resolveServerModel,
} from "@/lib/assistant/constants";

export const runtime = "nodejs";

/** Public config for Fitness360 AI UI — never exposes the API key. */
export async function GET() {
  return NextResponse.json({
    serverKeyConfigured: Boolean(resolveServerApiKey()),
    model: resolveServerModel() || FITNESS360_AI_DEFAULT_MODEL,
  });
}
