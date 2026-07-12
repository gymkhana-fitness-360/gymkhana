import { redirect } from "next/navigation";

export default function SettingsAccountRedirect() {
  redirect("/dashboard/settings?tab=users");
}
