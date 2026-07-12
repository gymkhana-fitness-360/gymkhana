import type { NextRequest } from "next/server";

export type ParsedListQueryParams = {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
};

export type ParseQueryParamsOptions = {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
};

function clampPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

/**
 * Shared pagination / search / sort parsing for list endpoints.
 * Domain-specific filters (status, method, etc.) stay in each handler.
 */
export function parseQueryParams(
  req: NextRequest,
  options: ParseQueryParamsOptions = {}
): ParsedListQueryParams {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 500,
  } = options;
  const sp = req.nextUrl.searchParams;
  const page = clampPositiveInt(parseInt(sp.get("page") || String(defaultPage), 10), defaultPage);
  let limit = clampPositiveInt(parseInt(sp.get("limit") || String(defaultLimit), 10), defaultLimit);
  if (limit > maxLimit) limit = maxLimit;
  const searchRaw = sp.get("search");
  const search = searchRaw && searchRaw.trim() ? searchRaw.trim() : undefined;
  const sortByRaw = sp.get("sortBy");
  const sortBy = sortByRaw && sortByRaw.trim() ? sortByRaw.trim() : undefined;
  return { page, limit, search, sortBy };
}
