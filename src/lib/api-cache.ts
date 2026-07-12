import { NextResponse } from "next/server";

/**
 * Cache duration in seconds for API responses.
 * Browser will serve cached response on page refresh within this window.
 */
const CACHE_MAX_AGE = 60; // 1 minute

/**
 * Add cache headers to a JSON response.
 * Use for GET endpoints - reduces refetch on page refresh.
 */
export function cachedJson<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set(
    "Cache-Control",
    `private, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE}`
  );
  return NextResponse.json(data, { ...init, headers });
}

/** No-cache JSON for frequently mutating dashboard payloads. */
export function noStoreJson<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}
