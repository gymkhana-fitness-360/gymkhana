import { createHmac, timingSafeEqual } from 'crypto';
import { readEnvVar } from '@/lib/prisma-env';

/**
 * QR HMAC secret: never use a guessable default in production (forgery risk).
 * Dev may omit env vars and use a local-only fallback.
 */
function getQRSecret(): string {
  const secret = readEnvVar('QR_SECRET') || readEnvVar('NEXTAUTH_SECRET');
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'QR signing misconfigured: set QR_SECRET or NEXTAUTH_SECRET in production'
    );
  }
  return 'fallback-dev-secret';
}

export function signQRData(data: object): string {
  const payload = JSON.stringify(data);
  const signature = createHmac('sha256', getQRSecret()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

export function verifyQRData(qrData: string): { valid: boolean; data?: unknown } {
  try {
    const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString()) as {
      payload?: string;
      signature?: string;
    };
    const { payload, signature } = decoded;

    if (typeof payload !== 'string' || typeof signature !== 'string') {
      return { valid: false };
    }

    const expectedSig = createHmac('sha256', getQRSecret()).update(payload).digest('hex');
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false };
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false };
    }

    return { valid: true, data: JSON.parse(payload) as unknown };
  } catch {
    return { valid: false };
  }
}
