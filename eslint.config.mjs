import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const grandfatherPrismaRoutes = JSON.parse(
  readFileSync(path.join(__dirname, "eslint.grandfather-prisma-routes.json"), "utf8"),
);

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    files: grandfatherPrismaRoutes,
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/app/api/**/route.ts"],
    ignores: grandfatherPrismaRoutes,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "M0: use domain handlers + adapters (see docs/API_ROUTE_AUDIT.md). Grandfather: eslint.grandfather-prisma-routes.json",
            },
          ],
        },
      ],
    },
  },
];

export default config;
