import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Product root (Freshservice-style).
 * Product root. Marketing / developers / playground live on MARKETING_SITE_URL (cloud repo).
 * Signed-in → dashboard; everyone else → login.
 */
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
