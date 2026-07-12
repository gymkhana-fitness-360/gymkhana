export type MarketplaceAppCategory =
  | "scheduling"
  | "payments"
  | "mobile"
  | "messaging"
  | "localization"
  | "ecosystem";

export type MarketplaceAppStatus = "available" | "beta" | "coming_soon";

export interface MarketplaceApp {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  category: MarketplaceAppCategory;
  status: MarketplaceAppStatus;
  /** Dashboard settings route after install */
  configurePath: string;
  /** Member-facing route when applicable */
  memberPath?: string;
  envKeys?: string[];
  featured: boolean;
}

/** Six flagship apps (MyGymDesk parity) — install from dashboard marketplace */
export const FLAGSHIP_MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    slug: "class-booking",
    name: "Class Booking & Schedule",
    tagline: "Group classes, capacity, and member bookings",
    description:
      "Create class schedules, set capacity, and let staff or members book spots. Integrates with attendance and member profiles.",
    icon: "📅",
    category: "scheduling",
    status: "available",
    configurePath: "/dashboard/classes",
    memberPath: "/member/classes",
    featured: true,
  },
  {
    slug: "razorpay-payments",
    name: "Razorpay Online Payments",
    tagline: "UPI, cards, and payment links for renewals",
    description:
      "Collect membership fees online with Razorpay payment links and webhooks. Auto-record payments when checkout completes.",
    icon: "💳",
    category: "payments",
    status: "available",
    configurePath: "/dashboard/marketplace?app=razorpay-payments",
    memberPath: "/member/pay",
    envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
    featured: true,
  },
  {
    slug: "member-app",
    name: "Member Mobile App",
    tagline: "PWA for members — classes, pay, membership card",
    description:
      "Lightweight member portal: view membership, book classes, pay dues, and show QR for check-in. Installable on Android/iOS.",
    icon: "📱",
    category: "mobile",
    status: "available",
    configurePath: "/dashboard/marketplace?app=member-app",
    memberPath: "/member",
    featured: true,
  },
  {
    slug: "whatsapp-business-api",
    name: "WhatsApp Business API",
    tagline: "Official WABA templates & delivery receipts",
    description:
      "Upgrade from session automation to Meta WhatsApp Business API for template messages, opt-in, and delivery status.",
    icon: "💬",
    category: "messaging",
    status: "beta",
    configurePath: "/dashboard/whatsapp",
    envKeys: ["WHATSAPP_BUSINESS_PHONE_ID", "WHATSAPP_BUSINESS_TOKEN"],
    featured: true,
  },
  {
    slug: "india-localization",
    name: "India Localization",
    tagline: "Hindi, Bengali, INR pricing, and India-first GTM",
    description:
      "Hindi and Bengali for staff and member surfaces, localized pricing page, and date/number formats for Indian gyms.",
    icon: "🇮🇳",
    category: "localization",
    status: "available",
    configurePath: "/pricing",
    featured: true,
  },
  {
    slug: "integration-hub",
    name: "Integration Hub",
    tagline: "Accounting, access control, fitness trackers",
    description:
      "Connect Tally, Zoho, biometric gates, Strava, and more from one hub. Replaces scattered integration checklists.",
    icon: "🧩",
    category: "ecosystem",
    status: "beta",
    configurePath: "/dashboard/marketplace?app=integration-hub",
    featured: true,
  },
];

export const ECOSYSTEM_MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    slug: "stripe-payments",
    name: "Stripe",
    tagline: "Global card payments",
    description: "Accept international cards and subscriptions via Stripe.",
    icon: "🌐",
    category: "payments",
    status: "coming_soon",
    configurePath: "/dashboard/marketplace",
    envKeys: ["STRIPE_SECRET_KEY"],
    featured: false,
  },
  {
    slug: "google-fit",
    name: "Google Fit",
    tagline: "Sync workout activity",
    description: "Import member activity from Google Fit for challenges and PT reports.",
    icon: "🏃",
    category: "ecosystem",
    status: "coming_soon",
    configurePath: "/dashboard/marketplace",
    featured: false,
  },
];

export const ALL_MARKETPLACE_APPS: MarketplaceApp[] = [
  ...FLAGSHIP_MARKETPLACE_APPS,
  ...ECOSYSTEM_MARKETPLACE_APPS,
];

export function getMarketplaceApp(slug: string): MarketplaceApp | undefined {
  return ALL_MARKETPLACE_APPS.find((a) => a.slug === slug);
}

export const MARKETPLACE_CATEGORY_LABELS: Record<MarketplaceAppCategory, string> = {
  scheduling: "Scheduling",
  payments: "Payments",
  mobile: "Mobile",
  messaging: "Messaging",
  localization: "Localization",
  ecosystem: "Ecosystem",
};
