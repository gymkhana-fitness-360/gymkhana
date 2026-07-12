import type { NextConfig } from "next";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

/** App root from package.json (stable when the repo path contains spaces). */
const require = createRequire(import.meta.url);
const projectRoot = path.dirname(require.resolve("./package.json"));
const tailwindEntry = path.join(projectRoot, "node_modules/tailwindcss/index.css");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: tailwindEntry,
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss: tailwindEntry,
    };
    config.resolve.modules = [
      path.join(projectRoot, "node_modules"),
      ...(Array.isArray(config.resolve.modules)
        ? config.resolve.modules
        : config.resolve.modules
          ? [config.resolve.modules]
          : ["node_modules"]),
    ];
    return config;
  },
  serverExternalPackages: ["playwright-core", "@browserbasehq/sdk"],
};

export default nextConfig;
