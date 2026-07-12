"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemberDetailData } from "./member-detail-types";

export function MemberDetailHeader({ member }: { member: MemberDetailData }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <Link href="/dashboard/members">
        <Button variant="ghost" size="icon" aria-label="Back to members">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{member.name}</h1>
        <p className="text-sm text-muted-foreground">{member.phone}</p>
      </div>
    </div>
  );
}
