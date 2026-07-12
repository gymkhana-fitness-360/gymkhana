import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { GYM_COOKIE_NAME } from "@/lib/gym-constants";
import { listGymsForUser, resolveGymIdForUser } from "@/lib/gym-scope";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const initialGyms = await listGymsForUser(session.user.id);
  const initialGymId = await resolveGymIdForUser(
    session.user.id,
    cookieStore.get(GYM_COOKIE_NAME)?.value ?? null
  );

  return (
    <ErrorBoundary>
      <DashboardShell initialGyms={initialGyms} initialGymId={initialGymId}>
        {children}
      </DashboardShell>
    </ErrorBoundary>
  );
}
