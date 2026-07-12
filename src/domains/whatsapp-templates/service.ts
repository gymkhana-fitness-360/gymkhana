import type { WhatsAppTemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listWhatsAppTemplates(gymId: string) {
  return prisma.whatsAppTemplate.findMany({
    where: { gymId },
    orderBy: { name: "asc" },
  });
}

export async function createWhatsAppTemplate(
  gymId: string,
  data: {
    name: string;
    body: string;
    category?: WhatsAppTemplateCategory;
    metaTemplateName?: string;
    isApproved?: boolean;
  },
) {
  return prisma.whatsAppTemplate.create({
    data: {
      gymId,
      name: data.name,
      body: data.body,
      category: data.category ?? "GENERAL",
      metaTemplateName: data.metaTemplateName,
      isApproved: data.isApproved ?? false,
    },
  });
}

export async function updateWhatsAppTemplate(
  gymId: string,
  id: string,
  data: Partial<{
    name: string;
    body: string;
    category: WhatsAppTemplateCategory;
    metaTemplateName: string | null;
    isApproved: boolean;
  }>,
) {
  const existing = await prisma.whatsAppTemplate.findFirst({
    where: { id, gymId },
  });
  if (!existing) return null;
  return prisma.whatsAppTemplate.update({
    where: { id },
    data,
  });
}

export async function deleteWhatsAppTemplate(gymId: string, id: string) {
  const existing = await prisma.whatsAppTemplate.findFirst({
    where: { id, gymId },
  });
  if (!existing) return false;
  await prisma.whatsAppTemplate.delete({ where: { id } });
  return true;
}
