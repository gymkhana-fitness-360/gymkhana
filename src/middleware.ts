import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { applySecurityHeaders } from "@/lib/security/headers";
import { readEnvVar } from "@/lib/prisma-env";
import { isAgentApiEnabled } from "@/lib/app-env";
import { bypassesSessionMiddleware, classifyRoute } from "@/lib/security/api-auth-classes";

function withSecurityHeaders(response: NextResponse): NextResponse {
  return applySecurityHeaders(response);
}

function marketingSiteBase(): string {
  return (readEnvVar("NEXT_PUBLIC_MARKETING_SITE_URL") || "http://localhost:3001").replace(
    /\/$/,
    "",
  );
}

/** Commercial UI moved to `cloud/` — redirect stale bookmarks on the product host. */
function redirectToMarketingSite(pathname: string): NextResponse | null {
  if (
    pathname === "/developers" ||
    pathname.startsWith("/developers/") ||
    pathname === "/playground" ||
    pathname.startsWith("/playground/") ||
    pathname === "/opensource" ||
    pathname.startsWith("/opensource/")
  ) {
    return withSecurityHeaders(
      NextResponse.redirect(`${marketingSiteBase()}${pathname}`),
    );
  }
  return null;
}

function isFeatureRouteDisabled(pathname: string): boolean {
  if (
    (pathname.startsWith("/api/agent") || pathname.startsWith("/api/mcp")) &&
    !isAgentApiEnabled()
  ) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const marketingRedirect = redirectToMarketingSite(pathname);
  if (marketingRedirect) {
    return marketingRedirect;
  }

  if (isFeatureRouteDisabled(pathname)) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Not found" }, { status: 404 }),
      );
    }
    return withSecurityHeaders(new NextResponse(null, { status: 404 }));
  }

  const authClass = classifyRoute(pathname);
  const requiresSession = !bypassesSessionMiddleware(authClass);

  if (!requiresSession) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = await getToken({
    req: request,
    secret: readEnvVar("NEXTAUTH_SECRET"),
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 },
        ),
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (token.isActive === false) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Account deactivated", code: "ACCOUNT_DEACTIVATED" },
          { status: 403 },
        ),
      );
    }
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login?error=deactivated", request.url)),
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
};
