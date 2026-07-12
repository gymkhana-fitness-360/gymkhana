import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  contactNumber: z.string().optional(),
  password: z.string().optional(),
  name: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
}).passthrough();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";
import { createLogger } from "@/lib/logger";
import {
  resolveAccountIdForRequest,
  userBelongsToAccount,
} from "@/lib/account-user-scope";

const logger = createLogger("api-users");

// GET - Get single user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    
    if (!session || session.user?.role !== "ADMIN") {
      return ApiErrors.unauthorized();
    }

    const accountId = await resolveAccountIdForRequest(session.user.id, request);
    if (!accountId) {
      return ApiErrors.badRequest("No account context available.");
    }

    const { id } = await params;

    if (!(await userBelongsToAccount(id, accountId))) {
      return ApiErrors.notFound("User");
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return ApiErrors.notFound("User");
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error("Error fetching user:", error as Error);
    return ApiErrors.internal("Failed to fetch user");
  }
}

// PUT - Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    
    if (!session || session.user?.role !== "ADMIN") {
      return ApiErrors.unauthorized();
    }

    const accountId = await resolveAccountIdForRequest(session.user.id, request);
    if (!accountId) {
      return ApiErrors.badRequest("No account context available.");
    }

    const { id } = await params;

    if (!(await userBelongsToAccount(id, accountId))) {
      return ApiErrors.notFound("User");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const {
      contactNumber,
      password,
      name,
      role,
      isActive,
    } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return ApiErrors.notFound("User");
    }

    // Check if contactNumber is being changed and if it's already taken
    if (contactNumber && contactNumber !== existingUser.contactNumber) {
      const contactTaken = await prisma.user.findUnique({
        where: { contactNumber },
      });

      if (contactTaken) {
        return ApiErrors.validationError("Contact number already in use");
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    // Hash password if provided
    if (password) {
      updateData.passwordHash = await hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
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
  } catch (error) {
    logger.error("Error updating user:", error as Error);
    return ApiErrors.internal("Failed to update user");
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    
    if (!session || session.user?.role !== "ADMIN") {
      return ApiErrors.unauthorized();
    }

    const accountId = await resolveAccountIdForRequest(session.user.id, request);
    if (!accountId) {
      return ApiErrors.badRequest("No account context available.");
    }

    const { id } = await params;

    if (!(await userBelongsToAccount(id, accountId))) {
      return ApiErrors.notFound("User");
    }

    // Prevent deleting yourself
    if (id === session.user?.id) {
      return ApiErrors.validationError("Cannot delete your own account");
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return ApiErrors.notFound("User");
    }

    // Prevent deleting admin users
    if (user.role === Role.ADMIN) {
      return ApiErrors.validationError("Cannot delete admin users");
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error as Error);
    return ApiErrors.internal("Failed to delete user");
  }
}
