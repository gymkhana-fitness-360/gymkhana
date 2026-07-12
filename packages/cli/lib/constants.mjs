/** Canonical OSS repo — override with FITNESS360_GIT_URL for forks. */
export const DEFAULT_REPO_URL = "https://github.com/fitness360/fitness360.git";

/** Default clone directory (no spaces — avoids npm/Next.js path issues). */
export const DEFAULT_CLONE_DIR = "fitness360";

/** package.json `name` for the app root. */
export const APP_PACKAGE_NAME = "fitness360";

export function resolveRepoUrl() {
  const fromEnv = process.env.FITNESS360_GIT_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_REPO_URL;
}

/** Warn when cwd or target path contains spaces (common with Desktop folder names). */
export function warnIfPathHasSpaces(dir) {
  if (!/\s/.test(dir)) return;
  console.warn(`
⚠  Path contains spaces:
   ${dir}

   Many tools (git, npm, Next.js) work more reliably from a path like:
   ~/gymkhana-opensource

   To move an existing clone:
   mv "${dir}" ~/gymkhana-opensource && cd ~/gymkhana-opensource
`);
}
