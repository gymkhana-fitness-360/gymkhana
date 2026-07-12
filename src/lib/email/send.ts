export interface SendEmailInput {
  to?: string;
  subject: string;
  text: string;
  html?: string;
}

/** Best-effort transactional email (Resend when configured). */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<void> {
  if (!input.to) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Fitness360 <noreply@fitness360.app>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email]", input.subject, "→", input.to, input.text);
    }
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
}

export async function sendPaymentReceiptEmail(params: {
  to: string;
  memberName: string;
  amount: number;
  paymentDate: string;
  gymName: string;
}) {
  await sendTransactionalEmail({
    to: params.to,
    subject: `Payment receipt — ${params.gymName}`,
    text: `Hi ${params.memberName},\n\nWe received ₹${params.amount} on ${params.paymentDate}.\n\nThank you,\n${params.gymName}`,
  });
}
