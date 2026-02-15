import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EncryptionError } from '../errors.js';

const ALGORITHM = 'aes-256-gcm';

const IV_LENGTH = 16;

const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, keyHex: string): string {
  try {
    const key = Buffer.from(keyHex, 'hex');
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString('base64');
  } catch (error) {
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function decrypt(ciphertext: string, keyHex: string): string {
  try {
    const key = Buffer.from(keyHex, 'hex');
    const combined = Buffer.from(ciphertext, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
