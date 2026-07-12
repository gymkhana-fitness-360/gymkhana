"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type OAuthButtonsProps = {
  callbackUrl?: string;
  disabled?: boolean;
};

export function OAuthButtons({ callbackUrl = "/dashboard", disabled }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);

  const handleOAuth = async (provider: "google" | "github") => {
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || loadingProvider !== null}
        onClick={() => handleOAuth("google")}
        className="w-full h-11 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
      >
        {loadingProvider === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <GoogleIcon className="h-4 w-4 mr-2" />
        )}
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || loadingProvider !== null}
        onClick={() => handleOAuth("github")}
        className="w-full h-11 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
      >
        {loadingProvider === "github" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <GitHubIcon className="h-4 w-4 mr-2" />
        )}
        Continue with GitHub
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.6 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.8 3.4 14.6 2.5 12 2.5 6.9 2.5 2.7 6.7 2.7 11.8S6.9 21.1 12 21.1c6.9 0 8.5-4.8 8.5-7.3 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-transparent px-2 text-white/40">{label}</span>
      </div>
    </div>
  );
}
