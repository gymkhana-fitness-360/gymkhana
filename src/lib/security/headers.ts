import type { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";
// 'unsafe-eval' is only needed by the local dev server (React Fast Refresh / HMR).
// Gate it on true development so non-prod *staging* keeps production-parity CSP.
const isLocalDev = process.env.NODE_ENV === "development";

/**
 * OWASP-aligned response headers for pages and API routes.
 * CSP allows Next.js inline styles; scripts are self-hosted via the framework.
 */
export function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isLocalDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  headers.set("X-DNS-Prefetch-Control", "off");

  if (isProd) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}
