import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ApiKeysService } from './api-keys.service';
import { CliSessionsRepository } from './cli-sessions.repository';

const DEVICE_CODE_BYTES = 32;
const USER_CODE_LENGTH = 8;
const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SESSION_TTL_SECONDS = 10 * 60;
const POLL_INTERVAL_SECONDS = 2;

export interface CliStartResponse {
  device_code: string;
  user_code: string;
  verify_url: string;
  verify_url_complete: string;
  interval: number;
  expires_in: number;
}

export type CliPollResponse =
  | { status: 'pending' }
  | { status: 'denied' }
  | {
      status: 'approved';
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: 'Bearer';
    };

@Injectable()
export class CliAuthService {
  private readonly webBaseUrl: string;

  constructor(
    private readonly sessions: CliSessionsRepository,
    private readonly apiKeys: ApiKeysService,
    config: ConfigService,
  ) {
    this.webBaseUrl =
      config.get<string>('WEB_BASE_URL')?.replace(/\/$/, '') ??
      'https://graphchat.co';
  }

  async start(): Promise<CliStartResponse> {
    const deviceCode = randomBytes(DEVICE_CODE_BYTES).toString('hex');
    const userCode = this.generateUserCode();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    await this.sessions.create({
      deviceCodeHash: this.hash(deviceCode),
      userCode,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
    });

    return {
      device_code: deviceCode,
      user_code: userCode,
      verify_url: `${this.webBaseUrl}/cli-auth`,
      verify_url_complete: `${this.webBaseUrl}/cli-auth?code=${userCode}`,
      interval: POLL_INTERVAL_SECONDS,
      expires_in: SESSION_TTL_SECONDS,
    };
  }

  async approve(userCode: string, userId: string): Promise<void> {
    const normalized = userCode.toUpperCase().replace(/-/g, '');
    const session = await this.sessions.findByUserCode(normalized);
    if (!session) {
      throw new NotFoundException('Code not found.');
    }
    if (session.status !== 'pending') {
      throw new BadRequestException('Code already used.');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expired.');
    }
    const tokens = await this.apiKeys.createAndIssue(
      userId,
      `CLI (${new Date().toISOString().slice(0, 10)})`,
    );
    await this.sessions.approve(normalized, userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  }

  async poll(deviceCode: string): Promise<CliPollResponse> {
    const session = await this.sessions.findByDeviceHash(this.hash(deviceCode));
    if (!session) return { status: 'denied' };
    if (session.expiresAt.getTime() < Date.now()) {
      return { status: 'denied' };
    }
    if (session.status === 'pending') return { status: 'pending' };
    if (session.status === 'denied') return { status: 'denied' };
    if (session.status === 'approved' && session.approvedTokens) {
      // One-time pickup: delete the session as soon as tokens are handed out.
      await this.sessions.consume(this.hash(deviceCode));
      return {
        status: 'approved',
        access_token: session.approvedTokens.access_token,
        refresh_token: session.approvedTokens.refresh_token,
        expires_in: session.approvedTokens.expires_in,
        token_type: 'Bearer',
      };
    }
    return { status: 'denied' };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private generateUserCode(): string {
    const bytes = randomBytes(USER_CODE_LENGTH);
    let code = '';
    for (let i = 0; i < USER_CODE_LENGTH; i++) {
      code += USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length];
    }
    return code;
  }
}
