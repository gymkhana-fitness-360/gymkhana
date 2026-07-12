import { prisma } from "@/lib/prisma";
import {
  computeGstLine,
  DEFAULT_SUPPLEMENT_HSN,
  sumInvoiceLines,
  validateHsnCode,
} from "@/lib/commerce/gst";

export type CreateSupplementInvoiceInput = {
  memberId?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerGstin?: string;
  orderLineIds?: string[];
  lines?: {
    productId?: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unitPriceInr: number;
    gstRatePercent: number;
    priceIncludesGst?: boolean;
  }[];
  placeOfSupplyState?: string;
  notes?: string;
  issue?: boolean;
};

async function nextInvoiceNumber(gymId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;
  const last = await prisma.supplementGstInvoice.findFirst({
    where: { gymId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const seq = last
    ? parseInt(last.invoiceNumber.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createSupplementGstInvoice(
  gymId: string,
  userId: string,
  input: CreateSupplementInvoiceInput,
) {
  const gym = await prisma.gym.findFirst({
    where: { id: gymId },
    select: { gstin: true, invoiceLegalName: true, name: true },
  });
  if (!gym?.gstin) {
    return { error: "gym_gstin_required" as const };
  }

  const lineInputs: CreateSupplementInvoiceInput["lines"] = [];

  if (input.orderLineIds?.length) {
    const orderLines = await prisma.orderLine.findMany({
      where: {
        id: { in: input.orderLineIds },
        gymId,
        status: { in: ["PENDING", "PAID"] },
        supplementGstInvoiceId: null,
      },
      include: { Product: true, Member: true },
    });
    for (const ol of orderLines) {
      const p = ol.Product;
      const hsn = p.hsnCode ?? DEFAULT_SUPPLEMENT_HSN;
      if (!validateHsnCode(hsn)) {
        return { error: "invalid_hsn" as const, productId: p.id };
      }
      lineInputs.push({
        productId: p.id,
        description: p.name,
        hsnCode: hsn,
        quantity: ol.quantity,
        unitPriceInr: Number(ol.unitPriceInr),
        gstRatePercent: Number(p.gstRatePercent),
        priceIncludesGst: p.priceIncludesGst,
      });
    }
  }

  if (input.lines?.length) {
    lineInputs.push(...input.lines);
  }

  if (lineInputs.length === 0) {
    return { error: "no_lines" as const };
  }

  let memberName = input.buyerName;
  let memberPhone = input.buyerPhone;
  if (input.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: input.memberId, gymId },
      select: { name: true, phone: true },
    });
    if (!member) return { error: "member_not_found" as const };
    memberName = memberName ?? member.name;
    memberPhone = memberPhone ?? member.phone;
  }

  const breakdowns = lineInputs.map((l) =>
    computeGstLine({
      quantity: l.quantity,
      unitPriceInr: l.unitPriceInr,
      gstRatePercent: l.gstRatePercent,
      priceIncludesGst: l.priceIncludesGst ?? true,
    }),
  );
  const totals = sumInvoiceLines(breakdowns);
  const invoiceNumber = await nextInvoiceNumber(gymId);
  const issue = input.issue ?? true;

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.supplementGstInvoice.create({
      data: {
        gymId,
        invoiceNumber,
        memberId: input.memberId,
        buyerName: memberName,
        buyerPhone: memberPhone,
        buyerGstin: input.buyerGstin,
        ...totals,
        status: issue ? "ISSUED" : "DRAFT",
        placeOfSupplyState: input.placeOfSupplyState,
        notes: input.notes,
        issuedAt: issue ? new Date() : null,
        issuedById: issue ? userId : null,
        Lines: {
          create: lineInputs.map((l, i) => ({
            productId: l.productId,
            description: l.description,
            hsnCode: l.hsnCode,
            quantity: l.quantity,
            unitPriceInr: l.unitPriceInr,
            gstRatePercent: l.gstRatePercent,
            taxableValueInr: breakdowns[i].taxableValueInr,
            cgstInr: breakdowns[i].cgstInr,
            sgstInr: breakdowns[i].sgstInr,
            igstInr: breakdowns[i].igstInr,
            lineTotalInr: breakdowns[i].lineTotalInr,
          })),
        },
      },
      include: { Lines: true },
    });

    if (input.orderLineIds?.length) {
      await tx.orderLine.updateMany({
        where: { id: { in: input.orderLineIds }, gymId },
        data: {
          supplementGstInvoiceId: inv.id,
          status: "PAID",
        },
      });
    }

    return inv;
  });

  return { invoice };
}

export async function getSupplementGstInvoice(gymId: string, id: string) {
  return prisma.supplementGstInvoice.findFirst({
    where: { id, gymId },
    include: {
      Lines: { include: { Product: { select: { name: true } } } },
      Member: { select: { id: true, name: true, phone: true } },
      Gym: {
        select: {
          name: true,
          gstin: true,
          invoiceLegalName: true,
          address: true,
          phone: true,
          invoiceStateCode: true,
        },
      },
    },
  });
}

export async function listSupplementGstInvoices(
  gymId: string,
  filters?: { memberId?: string; limit?: number },
) {
  return prisma.supplementGstInvoice.findMany({
    where: {
      gymId,
      ...(filters?.memberId ? { memberId: filters.memberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    include: {
      Member: { select: { name: true } },
      _count: { select: { Lines: true } },
    },
  });
}
