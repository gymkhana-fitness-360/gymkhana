/**
 * Application Startup Script
 * Runs error monitor and health checks on server start
 */

import { ErrorMonitor } from "./error-monitor";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib-startup.ts");

export async function initializeApp() {
  logger.info("\n🚀 Initializing Fitness360...\n");

  // Start error monitor
  const monitor = ErrorMonitor.getInstance();
  await monitor.start();

  // Log startup info
  logger.info("✅ Error Monitor: Active");
  logger.info("✅ Self-Healing: Enabled");
  logger.info("✅ Health Checks: Running every minute");
  logger.info("\n🛡️  Your app is protected!\n");
}

// Auto-initialize in development
if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
  initializeApp().catch((error) => {
    logger.error("❌ Failed to initialize app:", error as Error);
  });
}
