/**
 * Fitness360 Validation System
 * Similar to FDK validate for Freshworks apps
 * Validates all endpoints, types, schemas, and configurations
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib-validate");

const execAsync = promisify(exec);

export interface ValidationResult {
  category: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
}

export interface ValidationReport {
  timestamp: string;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
  summary: string;
}

export class AppValidator {
  private results: ValidationResult[] = [];

  async validate(): Promise<ValidationReport> {
    logger.info("\n🔍 Fitness360 Validation Starting...\n");

    // Run all validations
    await this.validateTypeScript();
    await this.validatePrismaSchema();
    await this.validateAPIEndpoints();
    await this.validateEnvironmentVariables();
    await this.validateDependencies();
    await this.validateDatabaseConnection();
    await this.validateAuthConfiguration();
    await this.validateMiddleware();
    await this.validateValidators();
    await this.validateServices();

    // Generate report
    return this.generateReport();
  }

  private async validateTypeScript() {
    logger.info("📝 Validating TypeScript...");
    try {
      const { stdout, stderr } = await execAsync("npx tsc --noEmit");
      
      if (stderr && !stderr.includes("warning")) {
        this.addResult("TypeScript", "fail", "TypeScript compilation errors", stderr);
      } else {
        this.addResult("TypeScript", "pass", "No TypeScript errors");
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;
        const errorCount = (stdout.match(/error TS/g) || []).length;
        this.addResult(
          "TypeScript",
          "fail",
          `${errorCount} TypeScript error(s) found`,
          stdout.slice(0, 500)
        );
      } else {
        this.addResult("TypeScript", "fail", "TypeScript validation failed", error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async validatePrismaSchema() {
    logger.info("🗄️  Validating Prisma Schema...");
    try {
      await execAsync("npx prisma validate");
      this.addResult("Prisma Schema", "pass", "Schema is valid");

      // Check if client is generated
      try {
        await fs.access("node_modules/@prisma/client");
        this.addResult("Prisma Client", "pass", "Prisma Client is generated");
      } catch {
        this.addResult("Prisma Client", "warning", "Prisma Client may need regeneration");
      }
    } catch (error: unknown) {
      this.addResult("Prisma Schema", "fail", "Schema validation failed", error instanceof Error ? error.message : String(error));
    }
  }

  private async validateAPIEndpoints() {
    logger.info("🌐 Validating API Endpoints...");
    
    const apiDir = path.join(process.cwd(), "src/app/api");
    const endpoints = await this.findAPIEndpoints(apiDir);

    this.addResult("API Endpoints", "pass", `Found ${endpoints.length} endpoints`);

    // Check for required HTTP methods
    for (const endpoint of endpoints) {
      await this.validateEndpoint(endpoint);
    }
  }

  private async findAPIEndpoints(dir: string): Promise<string[]> {
    const endpoints: string[] = [];
    
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          endpoints.push(...await this.findAPIEndpoints(fullPath));
        } else if (file.name === "route.ts" || file.name === "route.tsx") {
          endpoints.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn("Could not read API directory for endpoint discovery", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    return endpoints;
  }

  private async validateEndpoint(filePath: string) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const endpointName = filePath.replace(process.cwd(), "").replace("/src/app", "");

      // Check for HTTP method exports
      const hasGET = content.includes("export async function GET") || content.includes("export const GET");
      const hasPOST = content.includes("export async function POST") || content.includes("export const POST");
      const hasPUT = content.includes("export async function PUT") || content.includes("export const PUT");
      const hasDELETE = content.includes("export async function DELETE") || content.includes("export const DELETE");

      if (!hasGET && !hasPOST && !hasPUT && !hasDELETE) {
        this.addResult(
          "API Endpoint",
          "warning",
          `${endpointName}: No HTTP methods exported`
        );
      }

      // Check for auth
      const hasAuth = content.includes("await auth()") || content.includes("const session");
      if (!hasAuth && !endpointName.includes("/auth/") && !endpointName.includes("/inngest") && !endpointName.includes("/health")) {
        this.addResult(
          "API Security",
          "warning",
          `${endpointName}: No authentication check found`
        );
      }

      // Check for error handling
      const hasTryCatch = content.includes("try {") && content.includes("catch");
      if (!hasTryCatch) {
        this.addResult(
          "API Error Handling",
          "warning",
          `${endpointName}: No try-catch block found`
        );
      }

      // Check for validation
      const hasValidation = content.includes("schema.parse") || content.includes("validateRequest");
      if ((hasPOST || hasPUT) && !hasValidation && !endpointName.includes("/inngest")) {
        this.addResult(
          "API Validation",
          "warning",
          `${endpointName}: No input validation found`
        );
      }

    } catch (error: unknown) {
      this.addResult("API Endpoint", "fail", `Failed to validate ${filePath}`, error instanceof Error ? error.message : String(error));
    }
  }

  private async validateEnvironmentVariables() {
    logger.info("🔐 Validating Environment Variables...");
    
    const required = [
      "DATABASE_URL",
      "DIRECT_DATABASE_URL",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
    ];

    const optional = [
      "CRON_SECRET",
      "QR_SECRET",
      "INNGEST_EVENT_KEY",
      "INNGEST_SIGNING_KEY",
    ];

    for (const varName of required) {
      const value = process.env[varName]?.trim().replace(/\\n$/g, "").replace(/\n$/g, "");
      if (!value) {
        this.addResult(
          "Environment Variables",
          "fail",
          `Required variable ${varName} is not set`
        );
      }
    }

    for (const varName of optional) {
      if (!process.env[varName]) {
        this.addResult(
          "Environment Variables",
          "warning",
          `Optional variable ${varName} is not set`
        );
      }
    }

    const setRequired = required.filter(v => process.env[v]).length;
    if (setRequired === required.length) {
      this.addResult(
        "Environment Variables",
        "pass",
        `All ${required.length} required variables are set`
      );
    }
  }

  private async validateDependencies() {
    logger.info("📦 Validating Dependencies...");
    
    try {
      const { stdout } = await execAsync("npm list --depth=0 --json");
      const deps = JSON.parse(stdout);

      const critical = ["next", "react", "prisma", "@prisma/client", "next-auth"];
      const missing = critical.filter(dep => !deps.dependencies[dep]);

      if (missing.length > 0) {
        this.addResult(
          "Dependencies",
          "fail",
          `Missing critical dependencies: ${missing.join(", ")}`
        );
      } else {
        this.addResult("Dependencies", "pass", "All critical dependencies installed");
      }

      // Check for vulnerabilities
      try {
        await execAsync("npm audit --json");
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'stdout' in error) {
          const stdout = (error as { stdout: string }).stdout;
          const audit = JSON.parse(stdout);
          const high = audit.metadata?.vulnerabilities?.high || 0;
          const critical = audit.metadata?.vulnerabilities?.critical || 0;

          if (critical > 0 || high > 0) {
            this.addResult(
              "Security",
              "warning",
              `Found ${critical} critical and ${high} high severity vulnerabilities`
            );
          }
        }
      }
    } catch (error: unknown) {
      this.addResult("Dependencies", "warning", "Could not validate dependencies", error instanceof Error ? error.message : String(error));
    }
  }

  private async validateDatabaseConnection() {
    logger.info("🗄️  Validating Database Connection...");
    
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$queryRaw`SELECT 1`;
      this.addResult("Database", "pass", "Database connection successful");
    } catch (error: unknown) {
      this.addResult("Database", "fail", "Database connection failed", error instanceof Error ? error.message : String(error));
    }
  }

  private async validateAuthConfiguration() {
    logger.info("🔒 Validating Auth Configuration...");
    
    try {
      const authPath = path.join(process.cwd(), "src/lib/auth.ts");
      const content = await fs.readFile(authPath, "utf-8");

      if (!content.includes("NextAuth")) {
        this.addResult("Auth", "fail", "NextAuth not configured");
        return;
      }

      if (!content.includes("CredentialsProvider")) {
        this.addResult("Auth", "warning", "No credentials provider found");
      }

      if (!content.includes("session")) {
        this.addResult("Auth", "warning", "Session configuration missing");
      }

      this.addResult("Auth", "pass", "Auth configuration looks good");
    } catch (error: unknown) {
      this.addResult("Auth", "fail", "Could not validate auth", error instanceof Error ? error.message : String(error));
    }
  }

  private async validateMiddleware() {
    logger.info("🛡️  Validating Middleware...");
    
    try {
      const middlewarePath = path.join(process.cwd(), "src/middleware.ts");
      const content = await fs.readFile(middlewarePath, "utf-8");

      if (!content.includes("export async function middleware")) {
        this.addResult("Middleware", "fail", "Middleware function not exported");
        return;
      }

      if (!content.includes("auth()")) {
        this.addResult("Middleware", "warning", "No auth check in middleware");
      }

      if (!content.includes("export const config")) {
        this.addResult("Middleware", "warning", "Middleware config not defined");
      }

      this.addResult("Middleware", "pass", "Middleware configuration valid");
    } catch (error: unknown) {
      this.addResult("Middleware", "warning", "Middleware file not found or invalid");
    }
  }

  private async validateValidators() {
    logger.info("✅ Validating Validators...");
    
    try {
      const validatorsPath = path.join(process.cwd(), "src/lib/validators.ts");
      const content = await fs.readFile(validatorsPath, "utf-8");

      const schemaCount = (content.match(/Schema = z\.object/g) || []).length;
      
      if (schemaCount === 0) {
        this.addResult("Validators", "warning", "No Zod schemas found");
      } else {
        this.addResult("Validators", "pass", `Found ${schemaCount} Zod schemas`);
      }
    } catch (error: unknown) {
      this.addResult("Validators", "warning", "Validators file not found");
    }
  }

  private async validateServices() {
    logger.info("⚙️  Validating Services...");
    
    try {
      const servicesDir = path.join(process.cwd(), "src/lib/services");
      const files = await fs.readdir(servicesDir);
      
      const serviceFiles = files.filter(f => f.endsWith(".service.ts"));
      
      if (serviceFiles.length === 0) {
        this.addResult("Services", "warning", "No service files found");
      } else {
        this.addResult("Services", "pass", `Found ${serviceFiles.length} service(s)`);
      }
    } catch (error: unknown) {
      this.addResult("Services", "warning", "Services directory not found");
    }
  }

  private addResult(category: string, status: "pass" | "fail" | "warning", message: string, details?: string) {
    this.results.push({ category, status, message, details });
    
    const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️ ";
    logger.info(`${icon} ${category}: ${message}`);
  }

  private generateReport(): ValidationReport {
    const passed = this.results.filter(r => r.status === "pass").length;
    const failed = this.results.filter(r => r.status === "fail").length;
    const warnings = this.results.filter(r => r.status === "warning").length;

    let summary = "";
    if (failed === 0 && warnings === 0) {
      summary = "✅ All validations passed! Your app is ready for deployment.";
    } else if (failed === 0) {
      summary = `⚠️  All critical checks passed, but ${warnings} warning(s) found.`;
    } else {
      summary = `❌ ${failed} validation(s) failed. Please fix before deploying.`;
    }

    return {
      timestamp: new Date().toISOString(),
      passed,
      failed,
      warnings,
      results: this.results,
      summary,
    };
  }
}

// CLI usage
if (require.main === module) {
  const validator = new AppValidator();
  validator.validate().then((report) => {
    logger.info("\n" + "=".repeat(60));
    logger.info("📊 VALIDATION REPORT");
    logger.info("=".repeat(60));
    logger.info(`\n${report.summary}\n`);
    logger.info(`✅ Passed: ${report.passed}`);
    logger.info(`❌ Failed: ${report.failed}`);
    logger.info(`⚠️  Warnings: ${report.warnings}`);
    logger.info("\n" + "=".repeat(60) + "\n");

    process.exit(report.failed > 0 ? 1 : 0);
  });
}
