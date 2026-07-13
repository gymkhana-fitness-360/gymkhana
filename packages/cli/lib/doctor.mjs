import { dockerAvailable, nodeVersionOk } from "./prereqs.mjs";
import { warnIfPathHasSpaces } from "./constants.mjs";

export async function runDoctor() {
  console.log("\nFitness360 doctor\n");
  warnIfPathHasSpaces(process.cwd());
  const checks = [
    ["Node.js >= 24", nodeVersionOk(), process.version],
    ["npm", true, ""],
    ["Docker (recommended)", dockerAvailable(), dockerAvailable() ? "ok" : "not found"],
  ];

  for (const [label, ok, detail] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` (${detail})` : ""}`);
  }
  console.log("");
}
