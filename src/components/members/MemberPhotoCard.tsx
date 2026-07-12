"use client";

import { useRef, useState } from "react";
import { Camera, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMemberAvatarUrl } from "@/lib/member-avatar";

type MemberPhotoCardProps = {
  memberId: string;
  name: string;
  photo?: string | null;
  onPhotoChange: () => void;
};

export function MemberPhotoCard({ memberId, name, photo, onPhotoChange }: MemberPhotoCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayPhoto = photo || buildMemberAvatarUrl(name, memberId);

  const handleUpload = async (file: File) => {
    setBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("memberId", memberId);
      form.append("file", file);
      const res = await fetch("/api/members/photo", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || "Upload failed");
      }
      onPhotoChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    setBusy("generate");
    setError(null);
    try {
      const res = await fetch("/api/members/photo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || "Generate failed");
      }
      onPhotoChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-4 sm:flex-row sm:items-center">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={displayPhoto} alt={`${name} photo`} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0">
          <Camera className="h-5 w-5 text-white opacity-0" aria-hidden />
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">Member photo</p>
        <p className="text-xs text-muted-foreground">
          Upload a photo or generate an initials avatar. Max 500KB (JPEG, PNG, WebP, GIF).
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {busy === "upload" ? "Uploading…" : "Upload photo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void handleGenerate()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {busy === "generate" ? "Generating…" : "Generate avatar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
