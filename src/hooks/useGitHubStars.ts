"use client";

import { useState, useEffect } from "react";

const DEFAULT_REPO = "fitness360/fitness360";

export function formatGitHubStars(count: number): string {
  if (count < 1000) return String(count);
  const k = count / 1000;
  return (Number.isInteger(k) ? k : k.toFixed(1)).toString().replace(/\.0$/, "") + "k";
}

export function useGitHubStars(repo: string = DEFAULT_REPO): number | null {
  const [githubStars, setGithubStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("GitHub API not ok"))))
      .then((data: { stargazers_count?: unknown }) => {
        if (cancelled || typeof data.stargazers_count !== "number") return;
        setGithubStars(data.stargazers_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return githubStars;
}
