export const LEGAL_LAST_UPDATED = "19 May 2026";
export const LEGAL_CONTACT_EMAIL = "mailgymkhana@gmail.com";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const privacySections: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "Fitness360 (“we”, “us”) is gym management software operated by GymKhana Fitness 360. This Privacy Policy explains how we collect, use, store, and protect personal data when you use our web application as a gym operator, staff member, or when your gym records member information in the system.",
      "We process data to provide membership, billing, attendance, and communication features. We do not sell personal data.",
    ],
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    paragraphs: ["Depending on how your gym uses Fitness360, we may process:"],
    bullets: [
      "Account data: name, phone number, email, role (admin/staff), login credentials (passwords stored hashed).",
      "Member data: name, contact details, membership plan, payment history, attendance records, optional notes.",
      "Operational data: gym/branch identifiers, audit logs, QR attendance events, billing documents.",
      "Technical data: IP address, browser type, session cookies, error logs (sanitized where possible).",
    ],
  },
  {
    id: "legal-basis",
    title: "Legal basis & purpose",
    paragraphs: [
      "We process personal data to perform our contract with the gym (providing the service), for legitimate interests (security, fraud prevention, product improvement), and where required by law.",
      "Gyms are typically the data controller for their members’ data; Fitness360 acts as a data processor when handling member records on the gym’s instructions.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "We retain data for as long as the gym’s account is active and as needed to comply with legal, tax, or accounting obligations. Gyms may request export or deletion of data subject to applicable law and backup cycles.",
    ],
  },
  {
    id: "security",
    title: "Security measures",
    paragraphs: [
      "We apply industry-standard safeguards including encrypted transport (HTTPS), hashed passwords, role-based access, parameterized database queries (no string-concatenated SQL), input validation, security headers (CSP, HSTS in production), and secrets stored only in environment variables—not in source code.",
    ],
  },
  {
    id: "sharing",
    title: "Subprocessors & sharing",
    paragraphs: [
      "We may use infrastructure providers (e.g. hosting, database, messaging) under contractual confidentiality obligations. We do not share member data with advertisers.",
    ],
    bullets: [
      "Hosting and database (e.g. Vercel, PostgreSQL/Supabase as configured by the operator).",
      "Optional integrations: WhatsApp Business API (Meta Cloud), push notifications—only when enabled by the gym.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    paragraphs: [
      "Depending on applicable law (including India’s DPDP Act where relevant), individuals may request access, correction, deletion, or restriction of their data. Members should contact their gym first; gyms may contact us at the address below.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies & sessions",
    paragraphs: [
      "We use essential cookies for authentication and session management. These are required for the app to function. We do not use third-party advertising cookies in the core product.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      `Questions about this policy: ${LEGAL_CONTACT_EMAIL}. Last updated: ${LEGAL_LAST_UPDATED}.`,
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of terms",
    paragraphs: [
      "By accessing or using Fitness360, you agree to these Terms of Service. If you use the service on behalf of a gym, you represent that you have authority to bind that organization.",
    ],
  },
  {
    id: "service",
    title: "The service",
    paragraphs: [
      "Fitness360 provides tools for member management, payments, attendance, reporting, and optional messaging. Features may change; we strive to provide reasonable notice for material changes.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts & security",
    paragraphs: [
      "You are responsible for safeguarding credentials and for activity under your account. Notify us promptly of unauthorized access. We may suspend accounts that violate these terms or pose security risk.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: ["You agree not to:"],
    bullets: [
      "Upload unlawful content or infringe others’ rights.",
      "Attempt to bypass authentication, probe for vulnerabilities, or inject malicious code (SQL, XSS, etc.).",
      "Overload or disrupt the service (abusive automation, scraping without permission).",
      "Use the service to store payment card data outside approved integrations.",
    ],
  },
  {
    id: "data",
    title: "Customer data",
    paragraphs: [
      "Gyms retain ownership of their business data. You grant us a limited license to host and process data solely to provide the service. You must have appropriate consent/notice for member data you enter.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer & limitation",
    paragraphs: [
      "The service is provided “as is” to the extent permitted by law. We are not liable for indirect or consequential damages. Our total liability is limited to fees paid in the twelve months before the claim, or INR 10,000, whichever is greater, unless law requires otherwise.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    paragraphs: [
      "Either party may terminate per agreement. On termination, access ends; data export/deletion follows the Privacy Policy and commercial terms.",
    ],
  },
  {
    id: "law",
    title: "Governing law",
    paragraphs: [
      "These terms are governed by the laws of India. Courts in Mumbai, Maharashtra shall have exclusive jurisdiction, subject to mandatory consumer protections.",
    ],
  },
  {
    id: "contact-terms",
    title: "Contact",
    paragraphs: [
      `Legal inquiries: ${LEGAL_CONTACT_EMAIL}. Last updated: ${LEGAL_LAST_UPDATED}.`,
    ],
  },
];
