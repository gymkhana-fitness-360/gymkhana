import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeAuthEmail,
  provisionOwnerAccount,
} from "@/lib/auth/provision-owner";

export type OAuthProfile = {
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
};

export async function resolveOAuthUser(profile: OAuthProfile): Promise<User> {
  const email = normalizeAuthEmail(profile.email);
  const provider = profile.provider.toLowerCase();
  const providerUserId = profile.providerUserId;

  const linked = await prisma.userAuthProvider.findUnique({
    where: {
      provider_providerUserId: { provider, providerUserId },
    },
    include: { User: true },
  });
  if (linked?.User.isActive) {
    return linked.User;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    if (!existingByEmail.isActive) {
      throw new Error("Account deactivated");
    }

    await prisma.userAuthProvider.upsert({
      where: {
        provider_providerUserId: { provider, providerUserId },
      },
      create: {
        userId: existingByEmail.id,
        provider,
        providerUserId,
      },
      update: {
        userId: existingByEmail.id,
      },
    });

    return existingByEmail;
  }

  const user = await provisionOwnerAccount({
    email,
    name: profile.name.trim() || email.split("@")[0] || "Owner",
  });

  await prisma.userAuthProvider.create({
    data: {
      userId: user.id,
      provider,
      providerUserId,
    },
  });

  return user;
}
