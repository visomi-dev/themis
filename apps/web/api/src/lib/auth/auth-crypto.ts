import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 32;

const hashSecret = async (secret: string) => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
};

const verifySecret = async (secret: string, storedHash: string) => {
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
};

const generateVerificationPin = () => randomInt(0, 1_000_000).toString().padStart(6, '0');

export { generateVerificationPin, hashSecret, verifySecret };
