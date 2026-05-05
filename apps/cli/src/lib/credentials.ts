import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  server: string;
  savedAt: number; // ms epoch
}

const TRCHAT_DIR = join(homedir(), '.trchat');
const CREDS_FILE = join(TRCHAT_DIR, 'credentials.json');

function ensureDir(): void {
  if (!existsSync(TRCHAT_DIR)) {
    mkdirSync(TRCHAT_DIR, { recursive: true, mode: 0o700 });
  }
}

export function saveCredentials(creds: Credentials): void {
  ensureDir();
  writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function loadCredentials(): Credentials | null {
  if (!existsSync(CREDS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDS_FILE, 'utf8')) as Credentials;
  } catch {
    return null;
  }
}

export function deleteCredentials(): void {
  if (existsSync(CREDS_FILE)) {
    unlinkSync(CREDS_FILE);
  }
}

/**
 * Returns true when the access token is within 60 seconds of expiry.
 * Used by `gph status` and to proactively refresh.
 */
export function isTokenExpired(creds: Credentials): boolean {
  const expiresAtMs = creds.savedAt + creds.expires_in * 1000;
  return Date.now() >= expiresAtMs - 60_000;
}
