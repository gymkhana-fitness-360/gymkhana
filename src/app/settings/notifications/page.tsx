import { redirect } from "next/navigation";

export default function SettingsNotificationsRedirect() {
  redirect("/dashboard/settings?tab=notifications");
}
