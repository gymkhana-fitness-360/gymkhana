"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, Dumbbell, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthDivider, OAuthButtons } from "@/components/auth/OAuthButtons";
import { MARKETING_SITE_URL, MARKETING_SITE_LABEL } from "@/lib/site-config";
import {
  WHATSAPP_MARKETING_LINE,
  WHATSAPP_TESTIMONIAL_LINE,
} from "@/lib/messaging/whatsapp-copy";

function getSafeCallbackUrl(url: string | null): string {
  const defaultUrl = "/dashboard";
  if (!url) return defaultUrl;
  
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.toLowerCase().startsWith("/\\") &&
    !url.includes(":")
  ) {
    return url;
  }
  
  return defaultUrl;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        contactNumber,
        password,
        remember: rememberMe ? "true" : "false",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid contact number or password");
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      } else {
        setError("Login failed. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10 pointer-events-none" />
        <div className="fixed top-1/4 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/15 rounded-full blur-[150px] pointer-events-none" />

        {/* Header */}
        <header className="relative z-10 p-6">
          <a
            href={MARKETING_SITE_URL}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to {MARKETING_SITE_LABEL}</span>
          </a>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <a href={MARKETING_SITE_URL} className="inline-flex items-center justify-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 shadow-lg shadow-orange-500/30">
                  <Dumbbell className="h-8 w-8 text-white" />
                </div>
              </a>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome back</h1>
              <p className="text-white/50">Sign in to your Fitness360 account</p>
            </div>

            {/* Login Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8">
              <OAuthButtons callbackUrl={callbackUrl} disabled={isLoading} />
              <AuthDivider label="or sign in with email" />

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email or phone */}
                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className="text-sm text-white/70">
                    Email or phone
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="contactNumber"
                      type="text"
                      name="contactNumber"
                      autoComplete="username"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      required
                      aria-required
                      aria-invalid={error ? true : undefined}
                      className="h-12 pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/30 rounded-xl"
                      placeholder="you@example.com or phone number"
                      aria-describedby={error ? "login-error" : undefined}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm text-white/70">
                      Password
                    </Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 rounded"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      aria-required
                      aria-invalid={error ? true : undefined}
                      className="h-12 pl-11 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/30 rounded-xl"
                      placeholder="Enter your password"
                      aria-describedby={error ? "login-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="border-white/30 bg-white/5 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white"
                    aria-describedby="remember-hint"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor="remember" className="text-sm text-white/60 cursor-pointer">
                      Remember me for 30 days
                    </Label>
                    <p id="remember-hint" className="text-xs text-white/35">
                      When off, your session expires sooner on this device.
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div 
                    id="login-error"
                    role="alert"
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-orange-500/40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </div>

            {/* Sign Up Link */}
            <p className="text-center mt-8 text-sm text-white/50">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 p-6 text-center space-y-2">
          <p className="text-xs text-white/40">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-white/70">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-white/70">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-xs text-white/30">
            © 2026 GymKhana Fitness 360. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Right Side - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-500 to-pink-600" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-4">
              Manage Your Gym Like a Pro
            </h2>
            <p className="text-white/80 mb-8">
              Join 500+ fitness centers across India using Fitness360 to save time, increase revenue, and deliver better member experiences.
            </p>
            
            {/* Features List */}
            <div className="space-y-4 text-left">
              {[
                "Track members & payments effortlessly",
                WHATSAPP_MARKETING_LINE,
                "QR-based attendance system",
                "Multi-gym support for chains",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="mt-12 p-6 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 text-left">
              <p className="text-white/90 italic mb-4">
                &ldquo;{WHATSAPP_TESTIMONIAL_LINE}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  R
                </div>
                <div>
                  <div className="font-medium text-white">Rajesh Sharma</div>
                  <div className="text-sm text-white/60">FitZone Gym, Mumbai</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          <span className="text-white/60">Loading...</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
