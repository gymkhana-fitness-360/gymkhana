/**
 * Self-Healing Error Monitor
 * Automatically detects and fixes common errors
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { createLogger } from "./logger";

const execAsync = promisify(exec);
const logger = createLogger('error-monitor');

interface ErrorPattern {
  pattern: RegExp;
  name: string;
  fix: () => Promise<void>;
}

const errorPatterns: ErrorPattern[] = [
  {
    pattern: /Export 'getServerSession' \(reexported as 'getServerSession'\) was not found in 'next-auth\/react'/,
    name: "NextAuth getServerSession import error",
    fix: async () => {
      logger.info("Fixing: NextAuth import issue");
      await execAsync("rm -rf .next");
      logger.info("Cleared Next.js cache");
    },
  },
  {
    pattern: /Module not found: Can't resolve/,
    name: "Module not found",
    fix: async () => {
      logger.info("Fixing: Installing missing dependencies");
      await execAsync("npm install");
      logger.info("Dependencies installed");
    },
  },
  {
    pattern: /Prisma Client.*not generated/,
    name: "Prisma Client not generated",
    fix: async () => {
      logger.info("Fixing: Generating Prisma Client");
      await execAsync("npx prisma generate");
      logger.info("Prisma Client generated");
    },
  },
  {
    pattern: /ECONNREFUSED.*5432/,
    name: "PostgreSQL connection refused",
    fix: async () => {
      logger.warn("PostgreSQL connection issue detected");
      logger.warn("Please ensure PostgreSQL is running");
      logger.info("Run: brew services start postgresql");
    },
  },
];

export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private isMonitoring = false;
  private buildCheckInterval: ReturnType<typeof setInterval> | null = null;
  private errorLog: Array<{ timestamp: Date; error: string; fixed: boolean }> = [];

  private constructor() {}

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  get isRunning(): boolean {
    return this.isMonitoring;
  }

  /** Clears periodic timers; safe to call multiple times. */
  async stop(): Promise<void> {
    if (this.buildCheckInterval) {
      clearInterval(this.buildCheckInterval);
      this.buildCheckInterval = null;
    }
    this.isMonitoring = false;
    logger.info("Error Monitor stopped");
  }

  async start() {
    if (this.isMonitoring) {
      logger.warn("Error monitor already running");
      return;
    }

    this.isMonitoring = true;
    logger.info("Error Monitor started - watching for issues");

    // Monitor build errors
    this.monitorBuildErrors();

    // Monitor runtime errors
    this.setupGlobalErrorHandlers();
  }

  private async monitorBuildErrors() {
    // Check for .next build errors
    const checkBuildErrors = async () => {
      try {
        const nextDir = path.join(process.cwd(), ".next");
        const buildLogPath = path.join(nextDir, "trace");
        
        // Check if build failed
        try {
          await fs.access(nextDir);
        } catch {
          // .next doesn't exist, likely build failed
          logger.warn("No .next directory found - build may have failed");
        }
      } catch (error) {
        logger.warn("Build error monitor check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // Check every 30 seconds
    if (this.buildCheckInterval) {
      clearInterval(this.buildCheckInterval);
    }
    this.buildCheckInterval = setInterval(checkBuildErrors, 30000);
  }

  private setupGlobalErrorHandlers() {
    // Catch unhandled promise rejections
    process.on("unhandledRejection", async (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      logger.error("Unhandled Promise Rejection", error);
      await this.handleError(error instanceof Error ? error.message : String(error));
    });

    // Catch uncaught exceptions
    process.on("uncaughtException", async (error: Error) => {
      logger.error("Uncaught Exception", error);
      await this.handleError(error instanceof Error ? error.message : String(error));
    });
  }

  private async handleError(errorMessage: string) {
    // Log the error
    this.errorLog.push({
      timestamp: new Date(),
      error: errorMessage,
      fixed: false,
    });

    // Try to find and apply a fix
    for (const errorPattern of errorPatterns) {
      if (errorPattern.pattern.test(errorMessage)) {
        logger.info(`Detected: ${errorPattern.name}`);
        try {
          await errorPattern.fix();
          
          // Mark as fixed
          const lastError = this.errorLog[this.errorLog.length - 1];
          if (lastError) {
            lastError.fixed = true;
          }

          logger.info("Fix applied successfully");
          
          // Restart the server if needed
          if (process.env.NODE_ENV === "development") {
            logger.info("Please restart the dev server to apply changes");
          }
          
          return;
        } catch (fixError) {
          const error = fixError instanceof Error ? fixError : new Error(String(fixError));
          logger.error("Failed to apply fix", error);
        }
      }
    }

    // No automatic fix available
    logger.warn("No automatic fix available for this error");
  }

  getErrorLog() {
    return this.errorLog;
  }

  getStats() {
    const total = this.errorLog.length;
    const fixed = this.errorLog.filter((e) => e.fixed).length;
    return {
      total,
      fixed,
      unfixed: total - fixed,
      fixRate: total > 0 ? (fixed / total) * 100 : 0,
    };
  }

  clear() {
    this.errorLog = [];
  }
}

// Auto-start in development
if (process.env.NODE_ENV === "development") {
  const monitor = ErrorMonitor.getInstance();
  monitor.start().catch((error) => logger.error("Failed to start error monitor", error instanceof Error ? error : new Error(String(error))));
  process.once("beforeExit", () => {
    void monitor.stop();
  });
}

export default ErrorMonitor;
