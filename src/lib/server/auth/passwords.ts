import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;

/**
 * Hash a password using Node.js native scrypt with a unique 16-byte cryptographically secure salt.
 * Result format: "<salt_hex>:<hash_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a candidate password against an existing scrypt salt:hash string using constant-time comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [salt, expectedHashHex] = parts;
  try {
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const expectedKey = Buffer.from(expectedHashHex, "hex");

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}
