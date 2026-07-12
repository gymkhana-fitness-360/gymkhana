"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PublicBookPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [gymName, setGymName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/book-trial?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.gym?.name) setGymName(j.data.gym.name);
        else if (j.gym?.name) setGymName(j.gym.name);
      })
      .catch(() => null);
  }, [slug]);

  const submit = async (bookTrial: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/book-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          phone,
          email: email || undefined,
          bookTrial,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Could not submit");
        return;
      }
      setDone(true);
      if (json.data?.gymName) setGymName(json.data.gymName);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Thank you!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {gymName ?? "The gym"} will contact you shortly on WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Book a free trial</CardTitle>
          <p className="text-sm text-muted-foreground">
            {gymName ? gymName : "Enter your details"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Phone (10 digits)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={loading || !name || phone.length < 10}
            onClick={() => submit(true)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request free trial"}
          </Button>
          <Button variant="outline" className="w-full" disabled={loading} onClick={() => submit(false)}>
            Enquiry only
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
