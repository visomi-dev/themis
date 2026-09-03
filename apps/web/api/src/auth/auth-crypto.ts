import { randomBytes, randomInt, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 32;

export async function hashSecret(secret: string) {
  const salt = randomBytes(16).toString('hex');

  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

export function generateVerificationPin() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
