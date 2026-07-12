import { createLogger } from "@/lib/logger";

const logger = createLogger("db-backup-cloud");

export type CloudBackupResult = {
  blobUrl: string | null;
  sizeBytes: number;
  rowCounts: Record<string, number>;
  pruned: number;
  stub: boolean;
};

/** Self-host stub — wire to Vercel Blob or S3 when BLOB_READ_WRITE_TOKEN is set. */
export async function runCloudDatabaseBackup(): Promise<CloudBackupResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.info("Cloud backup skipped — BLOB_READ_WRITE_TOKEN not configured");
    return {
      blobUrl: null,
      sizeBytes: 0,
      rowCounts: {},
      pruned: 0,
      stub: true,
    };
  }

  logger.warn("Cloud backup token present but exporter not implemented in opensource build");
  return {
    blobUrl: null,
    sizeBytes: 0,
    rowCounts: {},
    pruned: 0,
    stub: true,
  };
}
