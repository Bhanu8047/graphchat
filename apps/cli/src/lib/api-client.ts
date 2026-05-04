import axios, { AxiosError, AxiosInstance } from 'axios';
import chalk from 'chalk';
import { config } from './config.js';
import {
  Credentials,
  deleteCredentials,
  loadCredentials,
  saveCredentials,
} from './credentials.js';

/**
 * Build an axios client pointed at the configured server. Adds a response
 * interceptor that silently refreshes the access token on 401, retrying
 * the original request once.
 */
export function createClient(requireAuth = true): AxiosInstance {
  const creds = loadCredentials();
  const server = creds?.server ?? config.get('serverUrl');

  if (requireAuth && !creds) {
    console.error(
      chalk.red('Not logged in. Run: gph login --key sk-trchat-...'),
    );
    process.exit(1);
  }

  const client = axios.create({
    baseURL: `${server}/api`,
    headers: creds ? { Authorization: `Bearer ${creds.access_token}` } : {},
    timeout: 30_000,
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as
        | (typeof error.config & { _retried?: boolean })
        | undefined;
      if (
        error.response?.status === 401 &&
        original &&
        !original._retried &&
        creds
      ) {
        original._retried = true;
        try {
          const { data } = await axios.post<{
            access_token: string;
            expires_in: number;
          }>(`${server}/api/auth/refresh`, {
            refresh_token: creds.refresh_token,
          });
          const updated: Credentials = {
            ...creds,
            access_token: data.access_token,
            expires_in: data.expires_in ?? creds.expires_in,
            savedAt: Date.now(),
          };
          saveCredentials(updated);
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization =
            `Bearer ${updated.access_token}`;
          return client.request(original);
        } catch {
          deleteCredentials();
          console.error(
            chalk.red('Session expired. Run: gph login --key sk-trchat-...'),
          );
          process.exit(1);
        }
      }
      throw error;
    },
  );

  return client;
}
