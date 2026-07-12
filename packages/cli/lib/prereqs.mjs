import { execSync } from "node:child_process";
import fs from "node:fs";

const MIN_NODE = [20, 9, 0];

export function parseNodeVersion(raw) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(raw.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function nodeVersionOk(version = process.version) {
  const parsed = parseNodeVersion(version);
  if (!parsed) return false;
  for (let i = 0; i < 3; i += 1) {
    if (parsed[i] > MIN_NODE[i]) return true;
    if (parsed[i] < MIN_NODE[i]) return false;
  }
  return true;
}

export function commandExists(cmd) {
  try {
    execSync(process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export function dockerAvailable() {
  if (!commandExists("docker")) return false;
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function readPackageName(dir) {
  const pkgPath = `${dir}/package.json`;
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.name ?? null;
  } catch {
    return null;
  }
}
