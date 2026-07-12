/** Prisma-aligned string unions for JSON APIs — no `@prisma/client` import. */

export type MemberStatusWire = "ACTIVE" | "EXPIRED";

export type GenderWire = "MALE" | "FEMALE" | "OTHER";

export type PaymentMethodWire =
  | "UPI"
  | "CASH"
  | "MIXED"
  | "CARD"
  | "BANK_TRANSFER"
  | "OTHER";

export type PaymentStatusWire =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";

export type AttendanceMethodWire =
  | "MANUAL"
  | "RFID"
  | "QR_CODE"
  | "BIOMETRIC"
  | "GEOFENCE";
