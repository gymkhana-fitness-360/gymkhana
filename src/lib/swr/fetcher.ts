/** Shared SWR fetcher with session cookies and gym header. */
export async function swrFetcher<T>(
  url: string,
  init?: RequestInit & { gymId?: string },
): Promise<T> {
  const { gymId, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (gymId) headers.set("x-gym-id", gymId);

  const response = await fetch(url, {
    ...rest,
    credentials: rest.credentials ?? "include",
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
