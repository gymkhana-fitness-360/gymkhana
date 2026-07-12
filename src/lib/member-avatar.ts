/** DiceBear initials avatar URL (no API key required). */
export function buildMemberAvatarUrl(name: string, seed?: string): string {
  const value = encodeURIComponent(seed?.trim() || name.trim() || "Member");
  return `https://api.dicebear.com/9.x/initials/svg?seed=${value}&backgroundColor=f97316,fb923c,fdba74`;
}

export const MAX_MEMBER_PHOTO_BYTES = 512_000;

export const ALLOWED_MEMBER_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
