import type { IPaymentListQueries, IPaymentQueries, IPaymentService } from "../interfaces";
import { PrismaPaymentQueries } from "./prisma-payment-queries";
import { PaymentServiceAdapter } from "./payment-service-adapter";

let paymentQueries: (IPaymentQueries & IPaymentListQueries) | null = null;
let paymentService: IPaymentService | null = null;

export function getPaymentQueries(): IPaymentQueries & IPaymentListQueries {
  if (!paymentQueries) {
    paymentQueries = new PrismaPaymentQueries();
  }
  return paymentQueries;
}

export function getPaymentService(): IPaymentService {
  if (!paymentService) {
    paymentService = new PaymentServiceAdapter();
  }
  return paymentService;
}

export { PrismaPaymentQueries } from "./prisma-payment-queries";
export { PaymentServiceAdapter } from "./payment-service-adapter";
