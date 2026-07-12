"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
        if (data.resetUrl) setDevResetUrl(data.resetUrl);
      } else {
        setError(data.error || "Failed to send reset link");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10 pointer-events-none" />
      <div className="fixed top-1/4 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/15 rounded-full blur-[150px] pointer-events-none" />

      <header className="relative z-10 p-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 rounded-md"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="text-sm">Back to sign in</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 shadow-lg shadow-orange-500/30 mb-6">
            <Dumbbell className="h-8 w-8 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Forgot password?</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Enter your contact number and we&apos;ll send you a reset link if an account exists.
          </p>

          {submitted ? (
            <div className="space-y-4">
              <p className="text-green-400 text-sm">
                If an account exists for that number, a reset link has been sent.
              </p>
              {devResetUrl && (
                <p className="text-xs text-white/40 break-all">
                  Dev link: <a href={devResetUrl} className="text-orange-400 underline">{devResetUrl}</a>
                </p>
              )}
              <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl">
                <Link href="/login">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="contactNumber" className="text-white/80">Email or phone</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="contactNumber"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="you@example.com or phone number"
                    className="pl-10 bg-white/5 border-white/20 text-white"
                    required
                    minLength={10}
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
