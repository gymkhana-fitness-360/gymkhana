import { NextResponse } from "next/server";
import { AppValidator } from "@/lib/validate";

export async function validateEnvHandler() {
  const validator = new AppValidator();
  const report = await validator.validate();
  return NextResponse.json(report);
}
