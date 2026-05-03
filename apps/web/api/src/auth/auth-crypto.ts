import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 32;

export async function hashSecret(secret: string) {
  const salt = randomBytes(16).toString('hex');

  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifySecret(secret: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;

  const storedBuffer = Buffer.from(hash, 'hex');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}

export function generateVerificationPin() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateUserDeviceToken() {
  return randomBytes(32).toString('base64url');
}
