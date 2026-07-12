import type { AuditEntryDTO, AuditAction } from "./types";

export interface IAuditLogger {
  log(entry: {
    gymId: string | null;
    actorUserId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEntryDTO>;
}
