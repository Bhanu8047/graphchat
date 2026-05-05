import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ProviderCredential,
  ProviderCredentialSummary,
} from '@trchat/shared-types';
import { v4 as uuid } from 'uuid';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CredentialsRepository } from './credentials.repository';
import { UpsertCredentialDto } from './dto/upsert-credential.dto';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly repo: CredentialsRepository,
    private readonly encryption: EncryptionService,
  ) {}

  list(userId: string): Promise<ProviderCredentialSummary[]> {
    return this.repo.list(userId) as unknown as Promise<
      ProviderCredentialSummary[]
    >;
  }

  async upsert(
    userId: string,
    dto: UpsertCredentialDto,
  ): Promise<ProviderCredentialSummary> {
    const now = new Date().toISOString();
    const existing = await this.repo.findByProvider(userId, dto.provider);
    const record: ProviderCredential = {
      id: existing?.id ?? uuid(),
      userId,
      provider: dto.provider,
      label: dto.label.trim(),
      cipherText: this.encryption.encrypt(dto.apiKey),
      hint: this.encryption.hint(dto.apiKey),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repo.upsert(record);
    const { cipherText: _ignored, userId: _u, ...summary } = record;
    return summary;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete(id, userId);
    if (result.deletedCount === 0) {
      throw new NotFoundException('Credential not found.');
    }
  }

  /** Resolve plaintext API key for the given user+provider, or null. */
  async resolveSecret(
    userId: string,
    provider: ProviderCredential['provider'],
  ): Promise<string | null> {
    const record = await this.repo.findByProvider(userId, provider);
    if (!record) return null;
    try {
      return this.encryption.decrypt(record.cipherText);
    } catch {
      return null;
    }
  }
}
