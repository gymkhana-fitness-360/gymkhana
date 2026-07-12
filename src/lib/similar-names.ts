/**
 * Find similar member names using Levenshtein distance.
 * Used when exact match fails in quick entry - suggests alternates for confirmation.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Normalize name for comparison: lowercase, trim, collapse spaces.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Score similarity between query and candidate (0 = identical, higher = less similar).
 * Prefer: starts-with, contains, then Levenshtein.
 */
function similarityScore(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (q === c) return 0;
  if (c.startsWith(q) || q.startsWith(c)) return 1;
  if (c.includes(q) || q.includes(c)) return 2;
  const dist = levenshtein(q, c);
  const maxLen = Math.max(q.length, c.length);
  return 3 + (dist / maxLen) * 10; // Normalize by length
}

export interface SimilarMember {
  id: string;
  name: string;
  phone: string;
}

/**
 * Find members with names similar to the search query.
 * Returns up to `limit` members sorted by similarity (best first).
 */
export async function findSimilarMembers(
  prisma: { member: { findMany: (args: any) => Promise<SimilarMember[]> } },
  searchName: string,
  gymId: string,
  limit = 5
): Promise<SimilarMember[]> {
  if (!searchName || searchName.trim().length < 2) return [];

  const normalized = normalize(searchName);
  const firstChar = normalized[0];

  // Fetch candidates: names starting with same letter or containing the query
  const candidates = await prisma.member.findMany({
    where: {
      gymId,
      OR: [
        { name: { contains: searchName.trim(), mode: "insensitive" } },
        { name: { startsWith: firstChar, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, phone: true },
    take: 50, // Fetch more, then filter/sort
  });

  const scored = candidates
    .map((m) => ({
      ...m,
      score: similarityScore(searchName, m.name),
    }))
    .filter((m) => m.score < 8) // Exclude very dissimilar
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ id, name, phone }) => ({ id, name, phone }));

  return scored;
}
