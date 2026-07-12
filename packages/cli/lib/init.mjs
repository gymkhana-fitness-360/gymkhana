import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureEnvFile } from "./env.mjs";
import {
  commandExists,
  dockerAvailable,
  nodeVersionOk,
  readPackageName,
} from "./prereqs.mjs";
import { run, waitForPostgres } from "./run.mjs";
import {
  APP_PACKAGE_NAME,
  DEFAULT_CLONE_DIR,
  resolveRepoUrl,
  warnIfPathHasSpaces,
} from "./constants.mjs";

const REPO_URL = resolveRepoUrl();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findAppRootFromCli() {
  let dir = path.resolve(__dirname, "..", "..", "..");
  if (readPackageName(dir) === APP_PACKAGE_NAME) return dir;
  return null;
}

function resolveTargetDir(args) {
  const here = args.includes("--here");
  const filtered = args.filter((a) => a !== "--here");
  const name = filtered[0] || DEFAULT_CLONE_DIR;

  if (here) {
    const cwd = process.cwd();
    warnIfPathHasSpaces(cwd);
    if (readPackageName(cwd) === APP_PACKAGE_NAME) return cwd;
    throw new Error(
      `--here requires running inside the Fitness360 repository (package.json name: ${APP_PACKAGE_NAME})`,
    );
  }

  const fromCli = findAppRootFromCli();
  if (fromCli && filtered.length === 0) {
    return fromCli;
  }

  return path.resolve(process.cwd(), name);
}

function cloneRepo(targetDir) {
  if (fs.existsSync(targetDir)) {
    if (readPackageName(targetDir) === APP_PACKAGE_NAME) {
      console.log(`→ Using existing clone at ${targetDir}`);
      return;
    }
    throw new Error(`Directory exists and is not a Fitness360 app: ${targetDir}`);
  }

  if (!commandExists("git")) {
    throw new Error("git is required to clone Fitness360. Install git or clone manually.");
  }

  console.log(`→ Cloning ${REPO_URL} into ${targetDir}`);
  execSync(`git clone --depth 1 ${REPO_URL} "${targetDir}"`, { stdio: "inherit" });
}

function startPostgres(appRoot) {
  const composeFile = path.join(appRoot, "docker-compose.yml");
  if (!fs.existsSync(composeFile)) {
    console.log("⚠ docker-compose.yml not found — skipping Postgres container");
    return false;
  }

  if (!dockerAvailable()) {
    console.log(
      "⚠ Docker not available — ensure Postgres is running and DATABASE_URL in .env is correct",
    );
    return false;
  }

  console.log("→ Starting Postgres (docker compose)…");
  run("docker", ["compose", "-f", composeFile, "up", "-d", "postgres"], { cwd: appRoot });
  return true;
}

export async function runInit(args = []) {
  console.log("\n🏋️  Fitness360 — local setup\n");

  if (!nodeVersionOk()) {
    throw new Error(`Node.js >= 20.9 required (current: ${process.version})`);
  }

  const targetDir = resolveTargetDir(args);
  warnIfPathHasSpaces(targetDir);
  const isExisting = readPackageName(targetDir) === APP_PACKAGE_NAME;

  if (!isExisting) {
    cloneRepo(targetDir);
  }

  if (readPackageName(targetDir) !== APP_PACKAGE_NAME) {
    throw new Error(`Not a Fitness360 app directory: ${targetDir}`);
  }

  console.log(`→ App directory: ${targetDir}`);

  const envResult = ensureEnvFile(targetDir);
  console.log(envResult.created ? "→ Created .env with generated secrets" : "→ Using existing .env");

  const startedPg = startPostgres(targetDir);
  if (startedPg) {
    console.log("→ Waiting for Postgres…");
    await waitForPostgres();
  }

  if (!commandExists("npm")) {
    throw new Error("npm is required");
  }

  console.log("→ Installing dependencies (npm ci)…");
  run("npm", ["ci"], { cwd: targetDir });

  console.log("→ Applying database migrations…");
  run("npx", ["prisma", "migrate", "deploy"], { cwd: targetDir });

  console.log("→ Seeding demo tenant…");
  run("npm", ["run", "db:seed"], { cwd: targetDir });

  console.log(`
✓ Fitness360 is ready!

  cd ${targetDir === process.cwd() ? "." : targetDir}
  npm run dev

  App:     http://localhost:3000
  Docs:    http://localhost:3000/developers
  Demo:    http://localhost:3000/playground  (marketing sandbox — no install)

Sign up at /signup or log in at /login after creating an account.
`);
}
