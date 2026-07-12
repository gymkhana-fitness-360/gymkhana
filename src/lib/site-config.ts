/**
 * Central branding for the self-hostable product (white-label via env).
 *
 * Decision #20: "Fitness360" is the default end-user app name and is
 * white-labelable; the "Gymkhana" platform/company brand must NOT appear
 * in product chrome. Self-hosters override NEXT_PUBLIC_APP_NAME at build time.
 */
export const APP_NAME = (process.env.NEXT_PUBLIC_APP_NAME || "Fitness360").trim();

/** Short descriptor shown beside the app name in chrome. */
export const APP_TAGLINE = "Gym Management";

/** One-line product description for metadata/manifest. */
export const APP_DESCRIPTION =
  "Modern gym management system for tracking members, payments, and renewals";

/** Full title used in <title> and the PWA manifest. */
export const APP_TITLE = `${APP_NAME} - ${APP_TAGLINE} System`;

/**
 * Commercial marketing site (`cloud/` repo) — Freshservice-style split from the product app.
 * Product: `app.gymkhana.fit` (port 3000). Marketing: `www.gymkhana.fit` (port 3001 locally).
 */
export const MARKETING_SITE_URL = (
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL || "https://www.gymkhana.fit"
)
  .trim()
  .replace(/\/$/, "");

/** Short label for links, e.g. gymkhana.fit */
export const MARKETING_SITE_LABEL = (() => {
  try {
    return new URL(MARKETING_SITE_URL).hostname.replace(/^www\./, "");
  } catch {
    return "gymkhana.fit";
  }
})();

export function marketingPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${MARKETING_SITE_URL}${p}`;
}
