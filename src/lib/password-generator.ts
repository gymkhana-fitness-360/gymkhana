/**
 * Password Generator Utility
 * Generates secure random passwords for new employees
 */

import { randomBytes } from "crypto";
import { createLogger } from "./logger";

const logger = createLogger("password-generator");

const MIN_PASSWORD_LENGTH = 12;

/**
 * Uniform random integer in [0, max) via rejection sampling (avoids modulo bias).
 */
function secureRandomIntBelow(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error("max must be a positive integer");
  }
  const buf = randomBytes(4);
  const x = buf.readUInt32BE(0);
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  if (x >= limit) {
    return secureRandomIntBelow(max);
  }
  return x % max;
}

function getSecureRandomChar(chars: string): string {
  if (!chars.length) {
    throw new Error("chars must be non-empty");
  }
  return chars[secureRandomIntBelow(chars.length)];
}

/**
 * Generate a secure random password
 * Format: 3 words + 2 numbers + 1 special char (CSPRNG)
 * Example: "Sunset-River-Cloud-42!"
 * Always ≥12 chars with uppercase, lowercase, digits, and special characters.
 */
export function generateSecurePassword(): string {
  const words = [
    "Sunset", "River", "Cloud", "Mountain", "Ocean", "Forest", "Thunder", "Lightning",
    "Phoenix", "Dragon", "Tiger", "Eagle", "Falcon", "Panther", "Wolf", "Bear",
    "Crystal", "Diamond", "Silver", "Golden", "Emerald", "Ruby", "Sapphire", "Pearl",
    "Storm", "Blaze", "Frost", "Shadow", "Spirit", "Flame", "Wind", "Star",
  ];

  const specialCharSet = "!@#$%&*";

  const word1 = words[secureRandomIntBelow(words.length)];
  const word2 = words[secureRandomIntBelow(words.length)];
  const word3 = words[secureRandomIntBelow(words.length)];
  const num1 = secureRandomIntBelow(10);
  const num2 = secureRandomIntBelow(10);
  const special = getSecureRandomChar(specialCharSet);

  const password = `${word1}-${word2}-${word3}-${num1}${num2}${special}`;

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error("Generated password did not meet minimum length (internal error)");
  }

  logger.debug("Generated secure password", {
    length: password.length,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%&*]/.test(password),
  });

  return password;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%&*]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%&*)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
