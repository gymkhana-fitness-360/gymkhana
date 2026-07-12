"use client";

import { Suspense, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Loader2, ExternalLink } from "lucide-react";

function MemberPayContent() {
  const { translate } = useLocale();
  const params = useSearchParams();
  const memberId = params.get("memberId");
  const gymId = params.get("gymId");
  const demo = params.get("demo") === "1";

  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    if (!gymId || !phone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/member/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "OTP failed");
        return;
      }
      setOtpSent(true);
      if (json.data?.devCode) {
        setOtpCode(json.data.devCode);
      }
    } finally {
      setLoading(false);
    }
  };

  const payNow = async () => {
    if (!memberId || !gymId) {
      setError("Missing memberId or gymId in link");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (otpSent && otpCode.length === 6) {
        const verify = await fetch("/api/member/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gymId, phone, code: otpCode }),
        });
        if (!verify.ok) {
          setError("Invalid OTP");
          return;
        }
      }

      const res = await fetch("/api/public/member-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId, memberId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Could not create payment link");
        return;
      }
      const url = json.data?.checkoutUrl ?? json.checkoutUrl;
      if (url) {
        setCheckoutUrl(url);
        if (url.startsWith("http")) {
          window.location.href = url;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold">{translate("member.pay.title")}</h1>
      <p className="text-sm text-muted-foreground">
        Pay membership online via Razorpay when your gym has Online Payments enabled.
      </p>
      {demo && (
        <p className="rounded-md bg-muted p-3 text-sm">
          Demo mode — configure RAZORPAY_KEY_ID in production.
        </p>
      )}

      {!memberId || !gymId ? (
        <p className="text-sm text-destructive">
          Use the link from your gym: /member/pay?memberId=…&amp;gymId=…
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Verify phone (GTM-M-003)</p>
            <Input
              placeholder="Your registered phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {!otpSent ? (
              <Button variant="outline" className="w-full" onClick={sendOtp} disabled={loading}>
                Send OTP
              </Button>
            ) : (
              <Input
                placeholder="6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            )}
          </div>
          <Button className="w-full" onClick={payNow} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Pay with UPI / Card (Razorpay)
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          {checkoutUrl && !checkoutUrl.startsWith("http") && (
            <p className="text-xs text-muted-foreground">
              Demo checkout: {checkoutUrl}
            </p>
          )}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default function MemberPayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MemberPayContent />
    </Suspense>
  );
}
