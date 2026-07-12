import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  contactNumber: z.string().optional(),
  name: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
}).passthrough();
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";
import { generateSecurePassword } from "@/lib/password-generator";
import { createLogger } from "@/lib/logger";
import {
  listUserIdsForAccount,
  resolveAccountIdForRequest,
  userBelongsToAccount,
} from "@/lib/account-user-scope";

const logger = createLogger("api-users");

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
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

    const userIds = await listUserIdsForAccount(accountId);
    if (userIds.length === 0) {
      return cachedJson([]);
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        contactNumber: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return cachedJson(users);
  } catch (error) {
    logger.error("Failed to fetch users", error as Error);
    return ApiErrors.internal("Failed to fetch users");
  }
}

// POST - Create new employee (admin only)
export async function POST(request: NextRequest) {
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

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const {
      contactNumber,
      name,
      role,
      isActive = true,
    } = body;

    // Validation
    if (!contactNumber || !name) {
      return ApiErrors.validationError("Contact number and name are required");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { contactNumber },
    });

    if (existingUser) {
      return ApiErrors.validationError("User with this contact number already exists");
    }

    // Generate secure random password
    const generatedPassword = generateSecurePassword();
    const passwordHash = await hash(generatedPassword, 12);

    logger.info("Creating new user with generated password", {
      contactNumber,
      name,
      role,
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        contactNumber,
        passwordHash,
        mustChangePassword: true,
        name,
        role: role || Role.SUB_ADMIN,
        isActive,
        accountId,
        AccountMembership: {
          create: {
            accountId,
            role: role === Role.ADMIN ? "ADMIN" : "STAFF",
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        contactNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("User created successfully", {
      userId: user.id,
      contactNumber: user.contactNumber,
    });

    // Return user with generated password (only shown once)
    return NextResponse.json(
      {
        ...user,
        temporaryPassword: generatedPassword,
        message: "User created. Share this password securely - it will only be shown once.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error creating user:", error as Error);
    return ApiErrors.internal("Failed to create user");
  }
}
