import type { FreeTrialVisit, WalkInVisitKind } from "@prisma/client";

export type FreeTrialVisitDto = {
  id: string;
  kind: WalkInVisitKind;
  name: string;
  phone: string;
  visitDate: string;
  amount: number | null;
  notes: string | null;
  createdAt: string;
};

export function serializeFreeTrialVisit(row: FreeTrialVisit): FreeTrialVisitDto {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name.trim().toUpperCase(),
    phone: row.phone,
    visitDate: row.visitDate.toISOString().slice(0, 10),
    amount: row.amount != null ? Number(row.amount) : null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}
