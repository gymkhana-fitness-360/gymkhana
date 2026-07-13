/**
 * API edge auth taxonomy (GYM-P0-001).
 * Middleware uses this to decide session vs public edge; handlers enforce secrets/signatures.
 */

export const ApiAuthClass = {
  /** No session — auth pages, legal; commercial pages live on MARKETING_SITE_URL (cloud repo) */
  PUBLIC: "PUBLIC",
  /** NextAuth JWT required */
  SESSION: "SESSION",
  /** No session at edge; `Authorization: Bearer CRON_SECRET` verified in route */
  CRON_BEARER: "CRON_BEARER",
  /** No session at edge; signature verified in route (e.g. Razorpay) */
  WEBHOOK_SIGNED: "WEBHOOK_SIGNED",
  /** No session at edge; x-api-key verified in route handler */
  API_KEY: "API_KEY",
  /** No session at edge; OAuth client_credentials or Bearer access token in route (ADR-002) */
  OAUTH_BEARER: "OAUTH_BEARER",
} as const;

export type ApiAuthClassValue = (typeof ApiAuthClass)[keyof typeof ApiAuthClass];

const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/book",
  "/widget",
] as const;

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/inngest",
  "/api/assistant",
  "/api/public",
] as const;

export function classifyRoute(pathname: string): ApiAuthClassValue {
  if (pathname.startsWith("/api/cron")) {
    return ApiAuthClass.CRON_BEARER;
  }
  if (pathname.startsWith("/api/webhooks")) {
    return ApiAuthClass.WEBHOOK_SIGNED;
  }
  if (pathname.startsWith("/api/v1")) {
    return ApiAuthClass.API_KEY;
  }
  if (
    pathname.startsWith("/api/oauth") ||
    pathname.startsWith("/api/agent/v1") ||
    pathname.startsWith("/api/mcp")
  ) {
    return ApiAuthClass.OAUTH_BEARER;
  }

  for (const prefix of PUBLIC_API_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return ApiAuthClass.PUBLIC;
    }
  }

  if (pathname === "/") {
    return ApiAuthClass.PUBLIC;
  }

  for (const prefix of PUBLIC_PAGE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return ApiAuthClass.PUBLIC;
    }
  }

  return ApiAuthClass.SESSION;
}

/** Routes that skip NextAuth JWT check at the middleware edge */
export function bypassesSessionMiddleware(authClass: ApiAuthClassValue): boolean {
  return (
    authClass === ApiAuthClass.PUBLIC ||
    authClass === ApiAuthClass.CRON_BEARER ||
    authClass === ApiAuthClass.WEBHOOK_SIGNED ||
    authClass === ApiAuthClass.OAUTH_BEARER ||
    authClass === ApiAuthClass.API_KEY
  );
}
