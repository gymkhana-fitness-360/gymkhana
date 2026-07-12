import { redirect } from "next/navigation";

/** Legacy “Billing” menu → Razorpay / marketplace payment apps */
export default function SettingsBillingRedirect() {
  redirect("/dashboard/marketplace");
}
