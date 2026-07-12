"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import { Calendar, CreditCard, IdCard } from "lucide-react";

export default function MemberHomePage() {
  const { translate } = useLocale();

  const tiles = [
    {
      href: "/member/classes",
      title: translate("member.home.bookClass"),
      icon: Calendar,
    },
    {
      href: "/member/pay",
      title: translate("member.home.payDues"),
      icon: CreditCard,
    },
    {
      href: "/dashboard/attendance",
      title: translate("member.home.membership"),
      icon: IdCard,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{translate("member.home.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Install the Member App from your gym&apos;s marketplace to enable personalized login.
        </p>
      </div>
      <div className="grid gap-3">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <tile.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{tile.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">Tap to open</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
