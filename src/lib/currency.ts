import { prisma } from "@/lib/prisma";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export async function getGymCurrencyCode(gymId: string): Promise<string> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { currencyCode: true },
  });
  return gym?.currencyCode || "INR";
}

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? code;
}

export function formatCurrencyAmount(
  amount: number | string,
  currencyCode = "INR"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) {
    return `${currencySymbol(currencyCode)}0`;
  }
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  return `${currencySymbol(currencyCode)}${formatted}`;
}
