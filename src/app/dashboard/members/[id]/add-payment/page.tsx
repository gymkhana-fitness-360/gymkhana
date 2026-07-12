import { redirect } from "next/navigation";

export default async function AddPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/members/${id}/renew`);
}
