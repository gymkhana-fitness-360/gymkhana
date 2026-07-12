import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { termsSections } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Terms of Service | Fitness360",
  description: "Terms governing use of the Fitness360 gym management platform.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="Rules and conditions for using Fitness360 as a gym operator or staff user."
      sections={termsSections}
    />
  );
}
