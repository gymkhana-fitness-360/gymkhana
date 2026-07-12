/**
 * Auth Security Module
 * - Brute force protection
 * - Login attempt tracking
 * - Account lockout
 */

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

// In-memory store (use Redis in production for multi-instance)
const loginAttempts = new Map<string, LoginAttempt>();

// Lazy cleanup - runs on access instead of setInterval (serverless-compatible)
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 60_000;

function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  for (const [key, attempt] of loginAttempts.entries()) {
    if (now - attempt.firstAttemptAt > LOCKOUT_DURATION_MS + ATTEMPT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}

/**
 * Check if login is allowed for this identifier
 */
export function checkLoginAllowed(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
  message: string;
} {
  maybeCleanup();
  const attempt = loginAttempts.get(identifier);
  const now = Date.now();

  if (!attempt) {
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      lockedUntil: null,
      message: "OK",
    };
  }

  // Check if currently locked
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    const remainingMs = attempt.lockedUntil - now;
    const remainingMin = Math.ceil(remainingMs / 60_000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(attempt.lockedUntil),
      message: `Account locked. Try again in ${remainingMin} minute${remainingMin > 1 ? "s" : ""}.`,
    };
  }

  // Reset if lockout expired
  if (attempt.lockedUntil && now >= attempt.lockedUntil) {
    loginAttempts.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      lockedUntil: null,
      message: "OK",
    };
  }

  // Reset if attempt window expired
  if (now - attempt.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      lockedUntil: null,
      message: "OK",
    };
  }

  const remaining = MAX_LOGIN_ATTEMPTS - attempt.count;
  return {
    allowed: remaining > 0,
    remainingAttempts: Math.max(0, remaining),
    lockedUntil: null,
    message: remaining > 0 ? "OK" : "Too many attempts",
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(identifier: string): {
  locked: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
} {
  maybeCleanup();
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);

  if (!attempt || now - attempt.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    // Start new window
    loginAttempts.set(identifier, {
      count: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    });
    return {
      locked: false,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - 1,
      lockedUntil: null,
    };
  }

  attempt.count++;

  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
    return {
      locked: true,
      remainingAttempts: 0,
      lockedUntil: new Date(attempt.lockedUntil),
    };
  }

  return {
    locked: false,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.count,
    lockedUntil: null,
  };
}

/**
 * Clear login attempts on successful login
 */
export function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Session timeout configuration by role
 * Admins have SHORTER timeouts (high-value targets)
 */
export const SESSION_TIMEOUTS = {
  ADMIN: 60,      // 1 hour - highest security
  SUB_ADMIN: 120, // 2 hours
  STAFF: 240,     // 4 hours
  DEFAULT: 240,   // 4 hours fallback
} as const;

/**
 * Get session timeout in minutes for a role
 */
export function getSessionTimeoutMinutes(role: string): number {
  return SESSION_TIMEOUTS[role as keyof typeof SESSION_TIMEOUTS] || SESSION_TIMEOUTS.DEFAULT;
}

/**
 * Get JWT max age in seconds for a role
 */
export function getJwtMaxAgeSeconds(role: string): number {
  return getSessionTimeoutMinutes(role) * 60;
}
