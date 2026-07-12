/**
 * Cursor-based pagination utilities
 * More efficient than offset pagination for large datasets
 */

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Extract cursor from the last item in results.
 * Cursor is typically the ID of the last item.
 */
export function getNextCursor<T extends { id: string }>(
  data: T[],
  limit: number
): string | undefined {
  if (data.length < limit) return undefined;
  return data[data.length - 1]?.id;
}

/**
 * Build cursor pagination result.
 */
export function buildCursorResult<T extends { id: string }>(
  data: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = data.length === limit;
  const nextCursor = hasMore ? getNextCursor(data, limit) : undefined;

  return {
    data,
    nextCursor,
    hasMore,
  };
}

/**
 * Parse cursor pagination params from URL search params.
 */
export function parseCursorParams(
  searchParams: URLSearchParams,
  defaultLimit = 20,
  maxLimit = 100
): CursorPaginationParams {
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(parseInt(limitParam), maxLimit)
    : defaultLimit;

  return { cursor, limit };
}
