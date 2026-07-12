#!/usr/bin/env node
import { runDoctor } from "../lib/doctor.mjs";
import { runInit } from "../lib/init.mjs";

const [, , command = "init", ...args] = process.argv;

async function main() {
  switch (command) {
    case "init":
    case "install":
      await runInit(args);
      break;
    case "doctor":
      await runDoctor();
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
Fitness360 CLI — local install & setup

Usage:
  npx @fitness360/cli              Install and configure locally (default)
  npx @fitness360/cli init [dir]   Clone into [dir] (default: ./fitness360) and set up
  npx @fitness360/cli doctor       Check prerequisites

From a git clone:
  npx @fitness360/cli init --here  Set up the current directory (no clone)

Tip: clone into a path without spaces, e.g. ~/gymkhana-opensource
  Fork? FITNESS360_GIT_URL=https://github.com/you/fitness360.git npx @fitness360/cli

After setup:
  npm run dev
  open http://localhost:3000
`);
}

main().catch((err) => {
  console.error("\n✗ Setup failed:", err.message || err);
  process.exit(1);
});
