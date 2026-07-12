import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { privacySections } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy | Fitness360",
  description: "How Fitness360 collects, uses, and protects personal and member data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="How we handle personal data for gym operators, staff, and members recorded in the system."
      sections={privacySections}
    />
  );
}
