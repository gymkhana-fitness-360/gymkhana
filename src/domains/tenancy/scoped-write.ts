/**
 * Gym-scoped Prisma writes — prefer updateMany/deleteMany with gymId
 * to avoid cross-tenant updates when only an entity id is known.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class ScopedWriteError extends Error {
  constructor(
    message: string,
    public readonly code: "RESOURCE_NOT_IN_GYM" | "NOT_FOUND" = "RESOURCE_NOT_IN_GYM",
  ) {
    super(message);
    this.name = "ScopedWriteError";
  }
}

type Db = typeof prisma | Prisma.TransactionClient;

export async function updateMemberScoped(
  db: Db,
  gymId: string,
  memberId: string,
  data: Prisma.MemberUpdateInput,
) {
  const result = await db.member.updateMany({
    where: { id: memberId, gymId },
    data,
  });
  if (result.count === 0) {
    throw new ScopedWriteError(`Member ${memberId} not in gym ${gymId}`);
  }
  return result;
}

export async function updatePaymentScoped(
  db: Db,
  gymId: string,
  paymentId: string,
  data: Prisma.PaymentUpdateInput,
) {
  const result = await db.payment.updateMany({
    where: { id: paymentId, gymId },
    data,
  });
  if (result.count === 0) {
    throw new ScopedWriteError(`Payment ${paymentId} not in gym ${gymId}`);
  }
  return result;
}

export async function updateMembershipScoped(
  db: Db,
  gymId: string,
  membershipId: string,
  data: Prisma.MembershipUpdateInput,
) {
  const result = await db.membership.updateMany({
    where: { id: membershipId, gymId },
    data,
  });
  if (result.count === 0) {
    throw new ScopedWriteError(`Membership ${membershipId} not in gym ${gymId}`);
  }
  return result;
}

export async function deleteManyScoped<T extends { gymId: string }>(
  model: {
    deleteMany: (args: {
      where: { id: string; gymId: string };
    }) => Promise<{ count: number }>;
  },
  gymId: string,
  id: string,
) {
  const result = await model.deleteMany({ where: { id, gymId } });
  if (result.count === 0) {
    throw new ScopedWriteError(`Record ${id} not in gym ${gymId}`);
  }
  return result;
}

/** Build a tenant-safe where clause for id lookups. */
export function tenantWhere(gymId: string, id: string) {
  return { id, gymId };
}
