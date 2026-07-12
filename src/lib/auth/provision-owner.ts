import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import type { User } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Synthetic contact number for email-only accounts (keeps legacy unique contactNumber). */
export function contactNumberForEmail(email: string): string {
  return `e:${normalizeAuthEmail(email)}`;
}

export type ProvisionOwnerInput = {
  email: string;
  name: string;
  password?: string;
};

export async function provisionOwnerAccount(
  input: ProvisionOwnerInput,
): Promise<User> {
  const email = normalizeAuthEmail(input.email);
  const contactNumber = contactNumberForEmail(email);
  const passwordHash = input.password
    ? await hash(input.password, 12)
    : await hash(randomBytes(32).toString("hex"), 12);

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        name: `${input.name.trim()}'s account`,
        plan: "FREE",
      },
    });

    await tx.gym.create({
      data: {
        accountId: account.id,
        name: "My Gym",
      },
    });

    return tx.user.create({
      data: {
        email,
        contactNumber,
        passwordHash,
        name: input.name.trim(),
        role: Role.ADMIN,
        mustChangePassword: false,
        isActive: true,
        accountId: account.id,
        AccountMembership: {
          create: {
            accountId: account.id,
            role: "OWNER",
            isActive: true,
          },
        },
      },
    });
  });
}

export async function findUserByLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const normalizedEmail = trimmed.includes("@") ? normalizeAuthEmail(trimmed) : null;

  return prisma.user.findFirst({
    where: {
      OR: [
        { contactNumber: trimmed },
        ...(normalizedEmail
          ? [{ email: normalizedEmail }, { contactNumber: contactNumberForEmail(normalizedEmail) }]
          : []),
      ],
    },
  });
}
