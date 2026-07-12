import { prisma } from "@/lib/prisma";
import {
  billCodePrefixKey,
  billCodeSequenceKey,
  DEFAULT_BILL_PREFIX,
  DEFAULT_MEMBER_PREFIX,
  memberCodePrefixKey,
  memberCodeSequenceKey,
} from "./keys";

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function nextSequence(key: string, initial = 0): Promise<number> {
  const existing = await getSetting(key);
  const current = existing ? parseInt(existing, 10) : initial;
  const next = Number.isFinite(current) ? current + 1 : initial + 1;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: String(next) },
    update: { value: String(next) },
  });
  return next;
}

export async function getMemberCodePrefix(gymId: string): Promise<string> {
  return (await getSetting(memberCodePrefixKey(gymId))) || DEFAULT_MEMBER_PREFIX;
}

export async function getBillCodePrefix(gymId: string): Promise<string> {
  return (await getSetting(billCodePrefixKey(gymId))) || DEFAULT_BILL_PREFIX;
}

/** Next human member code using gym-configurable prefix + sequence. */
export async function generateNextMemberCode(gymId: string): Promise<string> {
  const prefix = await getMemberCodePrefix(gymId);
  const seq = await nextSequence(memberCodeSequenceKey(gymId), 609);
  return `${prefix}${seq}`;
}

/** Next bill number: PREFIX-YYYYMM-#### */
export async function generateNextBillNumber(gymId: string): Promise<string> {
  const prefix = await getBillCodePrefix(gymId);
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const seq = await nextSequence(billCodeSequenceKey(gymId), 0);
  const sequence = String(seq).padStart(4, "0");
  return `${prefix}${year}${month}-${sequence}`;
}
