/**
 * Database URLs for Prisma — single place to normalize Vercel-pulled values (trailing \\n).
 */

export function readEnvVar(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null || raw === "") return undefined;
  return raw.trim().replace(/\\n$/g, "").replace(/\n$/g, "");
}

function isPoolerUrl(url: string): boolean {
  return (
    url.includes("pooler.supabase.com") ||
    url.includes("pgbouncer=true") ||
    /:6543\//.test(url)
  );
}

/** Runtime URL for Next.js / PrismaClient (transaction pooler when available). */
export function getRuntimeDatabaseUrl(): string | undefined {
  const url = readEnvVar("DATABASE_URL");
  if (!url) return undefined;

  if (!isPoolerUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "10");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Direct Postgres URL for `prisma migrate`, `db push`, and long transactions. */
export function getDirectDatabaseUrl(): string | undefined {
  return readEnvVar("DIRECT_DATABASE_URL") ?? readEnvVar("DATABASE_URL");
}

export function requireDatabaseUrl(): string {
  const url = getRuntimeDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}
