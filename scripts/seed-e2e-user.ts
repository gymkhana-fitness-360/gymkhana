/**
 * Ensures the Playwright smoke user exists and is linked to the demo tenant.
 * Run after `db:seed-demo-gym`. Credentials match e2e/helpers/auth.ts defaults.
 *
 *   npm run db:seed-demo-gym && npm run db:seed-e2e-user
 */
import { hash } from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEFAULT_DEMO_GYM_ID,
} from "../src/lib/gym-constants";

const prisma = new PrismaClient();

const E2E_CONTACT = process.env.E2E_CONTACT ?? "9831947879";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Gympass@123!";
const E2E_NAME = process.env.E2E_NAME ?? "E2E Administrator";

async function main() {
  const account = await prisma.account.findUnique({
    where: { id: DEFAULT_DEMO_ACCOUNT_ID },
  });
  if (!account) {
    console.error("Demo account missing. Run: npm run db:seed-demo-gym");
    process.exit(1);
  }

  const passwordHash = await hash(E2E_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { contactNumber: E2E_CONTACT },
    create: {
      contactNumber: E2E_CONTACT,
      name: E2E_NAME,
      passwordHash,
      role: Role.ADMIN,
      mustChangePassword: false,
      isActive: true,
      accountId: DEFAULT_DEMO_ACCOUNT_ID,
      AccountMembership: {
        create: {
          accountId: DEFAULT_DEMO_ACCOUNT_ID,
          role: "OWNER",
          isActive: true,
        },
      },
    },
    update: {
      name: E2E_NAME,
      passwordHash,
      role: Role.ADMIN,
      mustChangePassword: false,
      isActive: true,
      accountId: DEFAULT_DEMO_ACCOUNT_ID,
    },
  });

  await prisma.accountMembership.upsert({
    where: {
      userId_accountId: { userId: user.id, accountId: DEFAULT_DEMO_ACCOUNT_ID },
    },
    create: {
      userId: user.id,
      accountId: DEFAULT_DEMO_ACCOUNT_ID,
      role: "OWNER",
      isActive: true,
    },
    update: { role: "OWNER", isActive: true },
  });

  const gym = await prisma.gym.findUnique({ where: { id: DEFAULT_DEMO_GYM_ID } });
  console.log(
    `E2E user ready: contact=${E2E_CONTACT}, gym=${gym?.name ?? DEFAULT_DEMO_GYM_ID}, userId=${user.id}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
