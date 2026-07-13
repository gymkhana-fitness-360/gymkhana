import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { createLogger } from "@/lib/logger";
import {
  resolveAccountIdForRequest,
  userBelongsToAccount,
} from "@/lib/account-user-scope";

const logger = createLogger("platform-users");

export const updateUserBodySchema = z
  .object({
    contactNumber: z.string().optional(),
    password: z.string().optional(),
    name: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
  })
  .passthrough();

async function requireAdminAccount(
  session: Session,
  request: NextRequest,
): Promise<string | NextResponse> {
  if (session.user?.role !== "ADMIN") {
    return ApiErrors.unauthorized();
  }
  const accountId = await resolveAccountIdForRequest(session.user.id, request);
  if (!accountId) {
    return ApiErrors.badRequest("No account context available.");
  }
  return accountId;
}

export async function getUserForAccount(
  session: Session,
  request: NextRequest,
  userId: string,
) {
  const accountId = await requireAdminAccount(session, request);
  if (accountId instanceof NextResponse) return accountId;

  if (!(await userBelongsToAccount(userId, accountId))) {
    return ApiErrors.notFound("User");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      contactNumber: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return ApiErrors.notFound("User");
  return NextResponse.json(user);
}

export async function updateUserForAccount(
  session: Session,
  request: NextRequest,
  userId: string,
  body: z.infer<typeof updateUserBodySchema>,
) {
  const accountId = await requireAdminAccount(session, request);
  if (accountId instanceof NextResponse) return accountId;

  if (!(await userBelongsToAccount(userId, accountId))) {
    return ApiErrors.notFound("User");
  }

  const { contactNumber, password, name, role, isActive } = body;
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) return ApiErrors.notFound("User");

  if (contactNumber && contactNumber !== existingUser.contactNumber) {
    const contactTaken = await prisma.user.findUnique({
      where: { contactNumber },
    });
    if (contactTaken) {
      return ApiErrors.validationError("Contact number already in use");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (contactNumber) updateData.contactNumber = contactNumber;
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (typeof isActive === "boolean") updateData.isActive = isActive;
  if (password) updateData.passwordHash = await hash(password, 12);

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      contactNumber: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function deleteUserForAccount(
  session: Session,
  request: NextRequest,
  userId: string,
) {
  const accountId = await requireAdminAccount(session, request);
  if (accountId instanceof NextResponse) return accountId;

  if (!(await userBelongsToAccount(userId, accountId))) {
    return ApiErrors.notFound("User");
  }

  if (userId === session.user?.id) {
    return ApiErrors.validationError("Cannot delete your own account");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return ApiErrors.notFound("User");
  if (user.role === Role.ADMIN) {
    return ApiErrors.validationError("Cannot delete admin users");
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ message: "User deleted successfully" });
}

export function logUserRouteError(action: string, error: unknown) {
  logger.error(`Error ${action}:`, error as Error);
}
