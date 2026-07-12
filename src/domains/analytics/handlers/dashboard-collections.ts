import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { ApiErrors } from "@/lib/api-handler";
import { getDashboardCollectionStats } from "../adapters/dashboard-collections-queries";

export async function dashboardCollectionsHandler(_request: NextRequest) {
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  const data = await getDashboardCollectionStats();
  return cachedJson(data);
}
