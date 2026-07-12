import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";
import { encode as encodeJwt } from "@auth/core/jwt";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
import { ensureUserLinkedToDemoAccount, isDemoModeEnabled } from "@/lib/gym-scope";
import {
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth-security";
import { findUserByLoginIdentifier } from "@/lib/auth/provision-owner";
import { resolveOAuthUser } from "@/lib/auth/oauth-users";

const JWT_MAX_AGE_REMEMBER_S = 30 * 24 * 60 * 60;
const JWT_MAX_AGE_SESSION_S = 24 * 60 * 60;

function jwtMaxAgeSeconds(token: unknown): number {
  if (!token || typeof token !== "object") return JWT_MAX_AGE_REMEMBER_S;
  const rememberMe = (token as { rememberMe?: boolean }).rememberMe;
  if (rememberMe === false) return JWT_MAX_AGE_SESSION_S;
  return JWT_MAX_AGE_REMEMBER_S;
}

function oauthConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
      (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  );
}

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    : null;

const githubProvider =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: JWT_MAX_AGE_REMEMBER_S,
  },
  jwt: {
    encode: async (params) =>
      encodeJwt({
        ...params,
        maxAge: jwtMaxAgeSeconds(params.token),
      }),
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleProvider ? [googleProvider] : []),
    ...(githubProvider ? [githubProvider] : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        contactNumber: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.contactNumber || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const identifier = credentials.contactNumber as string;

        const gate = checkLoginAllowed(identifier);
        if (!gate.allowed) {
          throw new Error(gate.message);
        }

        const rememberMe =
          credentials.remember === "true" || credentials.remember === true;

        const user = await findUserByLoginIdentifier(identifier);

        if (!user || !user.isActive) {
          recordFailedLogin(identifier);
          throw new Error("Invalid credentials");
        }

        if (!user.passwordHash) {
          recordFailedLogin(identifier);
          throw new Error("Sign in with Google or GitHub for this account");
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          recordFailedLogin(identifier);
          throw new Error("Invalid credentials");
        }

        if (process.env.NODE_ENV === "production" && !user.accountId) {
          throw new Error("Invalid credentials");
        }

        clearLoginAttempts(identifier);

        if (isDemoModeEnabled()) {
          await ensureUserLinkedToDemoAccount(user.id);
        }

        return {
          id: user.id,
          email: user.email ?? undefined,
          contactNumber: user.contactNumber,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const email =
        (profile as { email?: string } | undefined)?.email ??
        user.email ??
        null;
      if (!email) {
        return false;
      }

      const name =
        user.name ??
        (profile as { name?: string } | undefined)?.name ??
        email.split("@")[0] ??
        "Owner";

      try {
        const dbUser = await resolveOAuthUser({
          provider: account.provider,
          providerUserId: account.providerAccountId,
          email,
          name,
        });

        if (isDemoModeEnabled()) {
          await ensureUserLinkedToDemoAccount(dbUser.id);
        }

        user.id = dbUser.id;
        user.name = dbUser.name;
        user.role = dbUser.role;
        user.isActive = dbUser.isActive;
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      const REFRESH_MS = 5 * 60 * 1000;
      const now = Date.now();

      if (user) {
        return {
          ...token,
          id: user.id as string,
          role: user.role as Role,
          isActive: user.isActive !== false,
          isActiveCheckedAt: now,
          rememberMe: user.rememberMe,
        } as JWT;
      }

      if (token.id && typeof token.id === "string") {
        const checkedAt = token.isActiveCheckedAt ?? 0;
        const stale = now - checkedAt >= REFRESH_MS || token.isActive === undefined;
        if (!stale) {
          return token as JWT;
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { isActive: true },
        });

        return {
          ...token,
          isActive: dbUser?.isActive ?? false,
          isActiveCheckedAt: now,
        } as JWT;
      }

      return token as JWT;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});

export { oauthConfigured };
