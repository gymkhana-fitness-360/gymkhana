#!/usr/bin/env npx tsx
/**
 * CLI: replace all member-linked PII with fake data. Preserves member ids and relationships.
 *
 * Usage:
 *   CONFIRM_ANONYMIZE=I_UNDERSTAND npx tsx scripts/anonymize-member-pii.ts
 *   npx tsx scripts/anonymize-member-pii.ts --yes
 *   npx tsx scripts/anonymize-member-pii.ts --dry-run
 *
 * Requires DATABASE_URL (same as Prisma). Does not modify User (staff) records.
 */

import { PrismaClient } from "@prisma/client";
import { anonymizeAllMemberPii } from "./lib/member-pii-anonymizer";

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const yes = argv.includes("--yes");
  let fakerSeed: number | undefined;
  const seedIdx = argv.indexOf("--seed");
  if (seedIdx !== -1 && argv[seedIdx + 1]) {
    fakerSeed = parseInt(argv[seedIdx + 1], 10);
    if (Number.isNaN(fakerSeed)) {
      console.error("Invalid --seed value");
      process.exit(1);
    }
  }
  return { dryRun, yes, fakerSeed };
}

async function main() {
  const { dryRun, yes, fakerSeed } = parseArgs(process.argv.slice(2));

  const envOk = process.env.CONFIRM_ANONYMIZE === "I_UNDERSTAND";
  if (!dryRun && !yes && !envOk) {
    console.error(
      "Refusing to run: this irreversibly replaces PII in the database.\n" +
        "  Re-run with: CONFIRM_ANONYMIZE=I_UNDERSTAND or flag --yes\n" +
        "  Preview counts with: --dry-run"
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    console.log(dryRun ? "[dry-run] No writes will be performed." : "Starting member PII anonymization…");
    const summary = await anonymizeAllMemberPii(prisma, { dryRun, fakerSeed });
    console.log(JSON.stringify(summary, null, 2));
    console.log(dryRun ? "[dry-run] Done." : "Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
