#!/usr/bin/env node
/** Quick two-gym settings isolation smoke (run after setting_gym_scope migration). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listGymSettings(gymId, keys) {
  const settings = await prisma.setting.findMany({
    where: { gymId, key: { in: keys } },
  });
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

async function upsertGymSetting(gymId, key, value) {
  await prisma.setting.upsert({
    where: { gymId_key: { gymId, key } },
    create: { gymId, key, value },
    update: { value },
  });
}

async function main() {
  const gyms = await prisma.gym.findMany({ take: 2, select: { id: true, name: true } });
  if (gyms.length < 2) {
    console.log("SKIP: need 2 gyms in DB, found", gyms.length);
    return;
  }
  const [a, b] = gyms;
  const key = "audit_smoke_test_key";
  await upsertGymSetting(a.id, key, "gym-a-value");
  await upsertGymSetting(b.id, key, "gym-b-value");
  const aRows = await listGymSettings(a.id, [key]);
  const bRows = await listGymSettings(b.id, [key]);
  const crossLeak = await prisma.setting.count({
    where: { key, gymId: a.id, value: "gym-b-value" },
  });
  const ok =
    aRows[key] === "gym-a-value" &&
    bRows[key] === "gym-b-value" &&
    crossLeak === 0;
  console.log(JSON.stringify({ gymA: a.name, gymB: b.name, aVal: aRows[key], bVal: bRows[key], ok }));
  await prisma.setting.deleteMany({ where: { key } });
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
