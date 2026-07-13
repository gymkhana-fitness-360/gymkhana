import type { ExpenseCategory, ExpenseStatus, PaymentMethod } from "@prisma/client";

export function getMethodBadge(method: PaymentMethod): string {
  const styles: Record<string, string> = {
    UPI: "bg-blue-100 text-blue-800 border-blue-200",
    CASH: "bg-green-100 text-green-800 border-green-200",
    MIXED: "bg-teal-100 text-teal-800 border-teal-200",
    CARD: "bg-purple-100 text-purple-800 border-purple-200",
    BANK_TRANSFER: "bg-indigo-100 text-indigo-800 border-indigo-200",
    OTHER: "bg-muted text-foreground border-border",
  };
  return styles[method] || styles.OTHER;
}

export function getExpenseStatusBadge(status: ExpenseStatus): string {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    PAID: "bg-green-100 text-green-800 border-green-200",
    OVERDUE: "bg-red-100 text-red-800 border-red-200",
  };
  return styles[status] || styles.PAID;
}

export function getCategoryBadge(category: ExpenseCategory): string {
  const styles: Record<string, string> = {
    RENT: "bg-red-100 text-red-800 border-red-200",
    UTILITIES: "bg-yellow-100 text-yellow-800 border-yellow-200",
    EQUIPMENT: "bg-blue-100 text-blue-800 border-blue-200",
    MAINTENANCE: "bg-orange-100 text-orange-800 border-orange-200",
    MARKETING: "bg-pink-100 text-pink-800 border-pink-200",
    SUPPLIES: "bg-green-100 text-green-800 border-green-200",
    INSURANCE: "bg-indigo-100 text-indigo-800 border-indigo-200",
    PROFESSIONAL_SERVICES: "bg-purple-100 text-purple-800 border-purple-200",
    SOFTWARE_SUBSCRIPTION: "bg-cyan-100 text-cyan-800 border-cyan-200",
    TRAVEL: "bg-teal-100 text-teal-800 border-teal-200",
    FOOD_BEVERAGES: "bg-amber-100 text-amber-800 border-amber-200",
    OTHER: "bg-muted text-foreground border-border",
  };
  return styles[category] || styles.OTHER;
}
