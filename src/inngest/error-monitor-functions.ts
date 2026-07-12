import { inngest } from "./client";
import { exec } from "child_process";
import { promisify } from "util";
import { createLogger } from "@/lib/logger";
import { isDevSelfHealEnabled } from "@/lib/app-env";

const logger = createLogger("app");

const execAsync = promisify(exec);

/**
 * Background job: Monitor and heal application errors
 * Runs continuously to detect and fix issues
 */
export const monitorAndHealErrors = inngest.createFunction(
  { id: "monitor-and-heal-errors" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    if (!isDevSelfHealEnabled()) {
      return { skipped: true, reason: "dev-self-heal-disabled" };
    }

    const issues: string[] = [];
    const fixes: string[] = [];

    // Check 1: Next.js build status
    await step.run("check-nextjs-build", async () => {
      try {
        const { stdout } = await execAsync("ls -la .next 2>&1");
        if (!stdout.includes("cache")) {
          issues.push("Next.js build incomplete");
          
          // Try to fix
          logger.info("🔧 Clearing Next.js cache...");
          await execAsync("rm -rf .next");
          fixes.push("Cleared Next.js cache");
        }
      } catch (error) {
        issues.push("Next.js .next directory missing");
      }
    });

    // Check 2: Prisma Client
    await step.run("check-prisma-client", async () => {
      try {
        await execAsync("npx prisma validate");
      } catch (error: unknown) {
        if (error instanceof Error ? error.message : String(error).includes("not generated")) {
          issues.push("Prisma Client not generated");
          
          // Try to fix
          logger.info("🔧 Generating Prisma Client...");
          await execAsync("npx prisma generate");
          fixes.push("Generated Prisma Client");
        }
      }
    });

    // Check 3: Node modules
    await step.run("check-node-modules", async () => {
      try {
        const { stdout } = await execAsync("npm list --depth=0 2>&1");
        if (stdout.includes("missing") || stdout.includes("UNMET")) {
          issues.push("Missing npm dependencies");
          
          // Try to fix
          logger.info("🔧 Installing dependencies...");
          await execAsync("npm install");
          fixes.push("Installed missing dependencies");
        }
      } catch (error) {
        // npm list returns non-zero if there are issues
      }
    });

    // Check 4: Database connection
    await step.run("check-database", async () => {
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.$queryRaw`SELECT 1`;
      } catch (error: unknown) {
        issues.push(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
        logger.info("⚠️  Database connection issue - please check PostgreSQL");
      }
    });

    await step.run("log-results", async () => {
      logger.info("\n🛡️  Error Monitor Report:");
      logger.info(`   Issues found: ${issues.length}`);
      logger.info(`   Fixes applied: ${fixes.length}`);
      
      if (issues.length > 0) {
        logger.info("\n   Issues:");
        issues.forEach((issue) => logger.info(`   - ${issue}`));
      }
      
      if (fixes.length > 0) {
        logger.info("\n   Fixes:");
        fixes.forEach((fix) => logger.info(`   ✅ ${fix}`));
      }
    });

    return {
      success: true,
      issues,
      fixes,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Background job: Auto-fix build errors on detection
 * Triggered when a build error is detected
 */
export const autoFixBuildError = inngest.createFunction(
  { id: "auto-fix-build-error" },
  { event: "error/build.detected" },
  async ({ event, step }) => {
    if (!isDevSelfHealEnabled()) {
      return { skipped: true, reason: "dev-self-heal-disabled" };
    }

    const { errorMessage, errorType } = event.data;

    const fixes = await step.run("apply-fixes", async () => {
      const appliedFixes: string[] = [];

      // Fix 1: NextAuth import errors
      if (errorMessage.includes("getServerSession") || errorMessage.includes("next-auth")) {
        logger.info("🔧 Fixing NextAuth import issue...");
        await execAsync("rm -rf .next");
        appliedFixes.push("Cleared Next.js cache for NextAuth fix");
      }

      // Fix 2: Module not found
      if (errorMessage.includes("Module not found") || errorMessage.includes("Can't resolve")) {
        logger.info("🔧 Installing missing modules...");
        await execAsync("npm install");
        appliedFixes.push("Installed missing dependencies");
      }

      // Fix 3: Prisma errors
      if (errorMessage.includes("Prisma") || errorMessage.includes("@prisma/client")) {
        logger.info("🔧 Regenerating Prisma Client...");
        await execAsync("npx prisma generate");
        appliedFixes.push("Regenerated Prisma Client");
      }

      // Fix 4: TypeScript errors
      if (errorMessage.includes("TS") && errorMessage.includes("error")) {
        logger.info("🔧 Clearing TypeScript cache...");
        await execAsync("rm -rf .next && rm -rf node_modules/.cache");
        appliedFixes.push("Cleared TypeScript cache");
      }

      return appliedFixes;
    });

    await step.run("log-fix-result", async () => {
      logger.info(`\n✅ Auto-fix completed for: ${errorType}`);
      logger.info(`   Applied ${fixes.length} fix(es):`);
      fixes.forEach((fix) => logger.info(`   - ${fix}`));
    });

    return {
      success: true,
      errorType,
      fixes,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Background job: Health check
 * Runs every minute to ensure all services are healthy
 */
export const healthCheck = inngest.createFunction(
  { id: "health-check" },
  { cron: "* * * * *" }, // Every minute
  async ({ step }) => {
    const health = {
      database: false,
      nextjs: false,
      timestamp: new Date().toISOString(),
    };

    // Check database
    await step.run("check-database", async () => {
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.$queryRaw`SELECT 1`;
        health.database = true;
      } catch (error) {
        logger.error("❌ Database health check failed:", error as Error);

        if (isDevSelfHealEnabled()) {
          await inngest.send({
            name: "error/build.detected",
            data: {
              errorMessage: "Database connection failed",
              errorType: "database",
            },
          });
        }
      }
    });

    // Check Next.js
    await step.run("check-nextjs", async () => {
      try {
        const response = await fetch("http://localhost:3000/api/inngest");
        health.nextjs = response.ok;
      } catch (error) {
        logger.error("❌ Next.js health check failed");
      }
    });

    return health;
  }
);
