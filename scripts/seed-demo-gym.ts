/**
 * Ensures default Account + Gym exist and links users without an account.
 * Uses the same UUIDs as migration `20260405190000_multi_gym_foundation`.
 *
 * Run: npx tsx scripts/seed-demo-gym.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEFAULT_DEMO_GYM_ID,
} from "../src/lib/gym-constants";

const prisma = new PrismaClient();

async function main() {
  await prisma.account.upsert({
    where: { id: DEFAULT_DEMO_ACCOUNT_ID },
    create: {
      id: DEFAULT_DEMO_ACCOUNT_ID,
      name: "Default account",
      plan: "FREE",
    },
    update: { name: "Default account" },
  });

  await prisma.gym.upsert({
    where: { id: DEFAULT_DEMO_GYM_ID },
    create: {
      id: DEFAULT_DEMO_GYM_ID,
      accountId: DEFAULT_DEMO_ACCOUNT_ID,
      name: "Main gym",
    },
    update: { name: "Main gym" },
  });

  // Starter plan catalog. The id "monthly" is the system default plan that
  // payment/membership inference falls back to (DEFAULT_MONTHLY_PLAN_ID), so a
  // fresh install can admit members out of the box.
  const plans: Array<{
    id: string;
    name: string;
    durationDays: number;
    price: number;
    planType: "GYM" | "PT";
  }> = [
    { id: "monthly", name: "Monthly", durationDays: 30, price: 1000, planType: "GYM" },
    { id: "quarterly", name: "Quarterly", durationDays: 90, price: 2700, planType: "GYM" },
    { id: "half-yearly", name: "Half-Yearly", durationDays: 180, price: 5000, planType: "GYM" },
    { id: "yearly", name: "Yearly", durationDays: 365, price: 9000, planType: "GYM" },
    { id: "pt-monthly", name: "Personal Training (Monthly)", durationDays: 30, price: 3000, planType: "PT" },
  ];
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        gymId: DEFAULT_DEMO_GYM_ID,
        name: plan.name,
        durationDays: plan.durationDays,
        price: plan.price,
        planType: plan.planType,
        isActive: true,
      },
      update: {
        gymId: DEFAULT_DEMO_GYM_ID,
        name: plan.name,
        durationDays: plan.durationDays,
        price: plan.price,
        planType: plan.planType,
        isActive: true,
      },
    });
  }

  const usersUpdated = await prisma.user.updateMany({
    where: { accountId: null },
    data: { accountId: DEFAULT_DEMO_ACCOUNT_ID },
  });

  console.log(
    `Demo tenant ready (account ${DEFAULT_DEMO_ACCOUNT_ID}, gym ${DEFAULT_DEMO_GYM_ID}). Plans: ${plans.length}. Users linked: ${usersUpdated.count}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
