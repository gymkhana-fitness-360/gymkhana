/**
 * Run an async mapper over items with bounded concurrency.
 *
 * Avoids the two extremes of `for ... await` (fully sequential — slow on large sets)
 * and `Promise.all(items.map(...))` (unbounded — can exhaust the DB connection pool).
 * Processes `size` items at a time. Order of results matches input order.
 */
export async function mapChunked<T, R>(
  items: readonly T[],
  size: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  const chunk = Math.max(1, size);
  for (let i = 0; i < items.length; i += chunk) {
    const slice = items.slice(i, i + chunk);
    const results = await Promise.all(slice.map((item, j) => fn(item, i + j)));
    out.push(...results);
  }
  return out;
}
