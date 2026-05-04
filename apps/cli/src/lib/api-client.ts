import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
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
 * the original request once. Concurrent 401s share a single in-flight
 * refresh promise to avoid stampeding the refresh endpoint.
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

  let inflightRefresh: Promise<string> | null = null;

  const refreshOnce = (): Promise<string> => {
    if (inflightRefresh) return inflightRefresh;
    if (!creds) return Promise.reject(new Error('Not logged in'));
    inflightRefresh = axios
      .post<{ access_token: string; expires_in: number }>(
        `${server}/api/auth/refresh`,
        { refresh_token: creds.refresh_token },
      )
      .then(({ data }) => {
        const updated: Credentials = {
          ...creds,
          access_token: data.access_token,
          expires_in: data.expires_in ?? creds.expires_in,
          savedAt: Date.now(),
        };
        saveCredentials(updated);
        return updated.access_token;
      })
      .finally(() => {
        inflightRefresh = null;
      });
    return inflightRefresh;
  };

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as
        | (AxiosRequestConfig & { _retried?: boolean })
        | undefined;
      if (
        error.response?.status === 401 &&
        original &&
        !original._retried &&
        creds
      ) {
        original._retried = true;
        try {
          const newToken = await refreshOnce();
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization =
            `Bearer ${newToken}`;
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
