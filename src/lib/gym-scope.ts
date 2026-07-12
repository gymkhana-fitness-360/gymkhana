import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEFAULT_DEMO_GYM_ID,
  GYM_COOKIE_NAME,
  GYM_HEADER_NAME,
} from "@/lib/gym-constants";
import {
  readRequestedAccountIdFromRequest,
  resolveAccountIdForUser,
} from "@/lib/account-scope";
import type { NextRequest } from "next/server";

/**
 * Demo mode is opt-in AND non-production only. It must never activate from
 * NODE_ENV alone (e.g. an internet-exposed staging build) or in production.
 * Requires `ALLOW_DEMO_ACCOUNT_AUTO_LINK=true` and a non-production runtime.
 */
export function isDemoModeEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEMO_ACCOUNT_AUTO_LINK === "true"
  );
}

export function readRequestedGymIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get(GYM_HEADER_NAME);
  if (header && header.trim()) return header.trim();
  const cookie = request.cookies.get(GYM_COOKIE_NAME)?.value;
  if (cookie && cookie.trim()) return cookie.trim();
  return null;
}

async function resolveAccountIdForGymListing(
  userId: string,
  request?: NextRequest,
): Promise<string | null> {
  const preferred = request
    ? readRequestedAccountIdFromRequest(request)
    : null;
  return resolveAccountIdForUser(userId, preferred);
}

/**
 * Gyms visible to this dashboard user (active account via membership or legacy accountId).
 */
export async function listGymsForUser(userId: string, request?: NextRequest) {
  const accountId = await resolveAccountIdForGymListing(userId, request);
  if (accountId) {
    return prisma.gym.findMany({
      where: { accountId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    });
  }

  if (!isDemoModeEnabled()) {
    return [];
  }
  const fallback = await prisma.gym.findMany({
    where: { id: DEFAULT_DEMO_GYM_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  });
  return fallback;
}

/**
 * Resolves active gym for API / server logic: must belong to the user's account (or demo fallback).
 */
export async function resolveGymIdForUser(
  userId: string,
  preferredGymId: string | null | undefined,
  request?: NextRequest,
): Promise<string | null> {
  const gyms = await listGymsForUser(userId, request);
  if (gyms.length === 0) return null;
  if (preferredGymId && gyms.some((g) => g.id === preferredGymId)) {
    return preferredGymId;
  }
  return gyms[0].id;
}

/**
 * Ensures the user can access the given gym; returns false if not linked to their account.
 */
export async function memberBelongsToGym(
  memberId: string,
  gymId: string,
): Promise<boolean> {
  const row = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true },
  });
  return !!row;
}

export async function userCanAccessGym(userId: string, gymId: string): Promise<boolean> {
  const gym = await prisma.gym.findFirst({
    where: { id: gymId },
    select: { accountId: true },
  });
  if (!gym) return false;

  const membership = await prisma.accountMembership.findFirst({
    where: { userId, accountId: gym.accountId, isActive: true },
    select: { id: true },
  });
  if (membership) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });
  if (user?.accountId === gym.accountId) return true;

  if (isDemoModeEnabled() && gymId === DEFAULT_DEMO_GYM_ID) {
    return true;
  }
  return false;
}

/**
 * Assigns the default demo account when `ALLOW_DEMO_ACCOUNT_AUTO_LINK=true` (login) or from seed scripts.
 * Do not call from production code paths without that guard.
 */
export async function ensureUserLinkedToDemoAccount(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, accountId: null },
    data: { accountId: DEFAULT_DEMO_ACCOUNT_ID },
  });
  await prisma.accountMembership.upsert({
    where: {
      userId_accountId: { userId, accountId: DEFAULT_DEMO_ACCOUNT_ID },
    },
    create: {
      userId,
      accountId: DEFAULT_DEMO_ACCOUNT_ID,
      role: "ADMIN",
    },
    update: { isActive: true },
  });
}
