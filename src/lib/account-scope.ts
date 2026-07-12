import type { NextRequest } from "next/server";
import type { AccountMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_COOKIE_NAME,
  ACCOUNT_HEADER_NAME,
} from "@/lib/account-constants";
import { DEFAULT_DEMO_ACCOUNT_ID } from "@/lib/gym-constants";

export type AccountOption = {
  id: string;
  name: string;
  role: AccountMemberRole;
};

export function readRequestedAccountIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get(ACCOUNT_HEADER_NAME);
  if (header?.trim()) return header.trim();
  const cookie = request.cookies.get(ACCOUNT_COOKIE_NAME)?.value;
  if (cookie?.trim()) return cookie.trim();
  return null;
}

/**
 * Accounts the user may access (franchise / agency multi-org).
 */
export async function listAccountsForUser(userId: string): Promise<AccountOption[]> {
  const memberships = await prisma.accountMembership.findMany({
    where: { userId, isActive: true },
    include: { Account: { select: { id: true, name: true } } },
    orderBy: { Account: { name: "asc" } },
  });

  if (memberships.length > 0) {
    return memberships.map((m) => ({
      id: m.Account.id,
      name: m.Account.name,
      role: m.role,
    }));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });
  if (user?.accountId) {
    const account = await prisma.account.findUnique({
      where: { id: user.accountId },
      select: { id: true, name: true },
    });
    if (account) {
      return [{ id: account.id, name: account.name, role: "ADMIN" }];
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const demo = await prisma.account.findUnique({
      where: { id: DEFAULT_DEMO_ACCOUNT_ID },
      select: { id: true, name: true },
    });
    if (demo) return [{ id: demo.id, name: demo.name, role: "OWNER" }];
  }

  return [];
}

export async function resolveAccountIdForUser(
  userId: string,
  preferredAccountId: string | null | undefined,
): Promise<string | null> {
  const accounts = await listAccountsForUser(userId);
  if (accounts.length === 0) return null;
  if (preferredAccountId && accounts.some((a) => a.id === preferredAccountId)) {
    return preferredAccountId;
  }
  return accounts[0].id;
}

export async function getAccountMemberRole(
  userId: string,
  accountId: string,
): Promise<AccountMemberRole | null> {
  const membership = await prisma.accountMembership.findUnique({
    where: { userId_accountId: { userId, accountId } },
    select: { role: true, isActive: true },
  });
  if (membership?.isActive) return membership.role;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true, role: true },
  });
  if (user?.accountId === accountId) {
    return user.role === "ADMIN" ? "ADMIN" : "STAFF";
  }
  return null;
}

export async function userCanAccessAccount(
  userId: string,
  accountId: string,
): Promise<boolean> {
  const role = await getAccountMemberRole(userId, accountId);
  return role !== null;
}
