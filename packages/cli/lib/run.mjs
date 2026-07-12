import { execSync, spawnSync } from "node:child_process";

export function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

export function runCapture(cmd, args, opts = {}) {
  return execSync([cmd, ...args].join(" "), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    ...opts,
  }).trim();
}

export async function waitForPostgres(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const out = runCapture("docker", [
        "exec",
        "fitness360-pg",
        "pg_isready",
        "-U",
        "fitness360",
        "-d",
        "fitness360",
      ]);
      if (out.includes("accepting connections")) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Postgres did not become ready in time");
}
