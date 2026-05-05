import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

/**
 * AES-256-GCM at-rest encryption for BYOK provider keys.
 * Key source: `CREDENTIAL_ENCRYPTION_KEY` env (any string; SHA-256 → 32 bytes).
 * Encoded payload: base64( iv | tag | ciphertext ).
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.get<string>('CREDENTIAL_ENCRYPTION_KEY');
    if (!secret || secret.length < 16) {
      throw new InternalServerErrorException(
        'CREDENTIAL_ENCRYPTION_KEY must be set (min 16 chars) to manage credentials.',
      );
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ct = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]).toString('base64');
  }

  decrypt(encoded: string): string {
    const buf = Buffer.from(encoded, 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
    const ct = buf.subarray(IV_BYTES + 16);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      'utf8',
    );
  }

  /** Last 4 chars of a plaintext key for masked display. */
  hint(plaintext: string): string {
    const trimmed = plaintext.trim();
    return trimmed.length <= 4 ? '****' : trimmed.slice(-4);
  }
}
