"use client";

import { MarketplaceGrid } from "@/components/marketplace/marketplace-grid";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/locale-provider";
export default function MarketplacePage() {
  const { translate } = useLocale();

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={translate("marketplace.title")}
        description={translate("marketplace.subtitle")}
        actions={<LanguageSwitcher />}
      />
      <MarketplaceGrid />
    </div>
  );
}
