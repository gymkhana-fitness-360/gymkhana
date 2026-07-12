import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DB_URL =
  "postgresql://fitness360:fitness360@localhost:5432/fitness360";

function secret() {
  return crypto.randomBytes(32).toString("base64");
}

export function ensureEnvFile(appRoot, { force = false } = {}) {
  const envPath = path.join(appRoot, ".env");
  if (fs.existsSync(envPath) && !force) {
    return { created: false, path: envPath };
  }

  const examplePath = path.join(appRoot, ".env.example");
  let template = "";
  if (fs.existsSync(examplePath)) {
    template = fs.readFileSync(examplePath, "utf8");
  }

  const replacements = {
    DATABASE_URL: DB_URL,
    DIRECT_DATABASE_URL: DB_URL,
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: secret(),
    CRON_SECRET: secret(),
    QR_SECRET: secret(),
    ALLOW_DEMO_ACCOUNT_AUTO_LINK: "true",
    NODE_ENV: "development",
  };

  let content = template;
  if (!content) {
    content = Object.entries(replacements)
      .map(([k, v]) => `${k}="${v}"`)
      .join("\n");
  } else {
    for (const [key, value] of Object.entries(replacements)) {
      const pattern = new RegExp(`^(${key}=).*$`, "m");
      if (pattern.test(content)) {
        content = content.replace(pattern, `$1"${value}"`);
      } else {
        content += `\n${key}="${value}"`;
      }
    }
  }

  fs.writeFileSync(envPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return { created: true, path: envPath };
}
