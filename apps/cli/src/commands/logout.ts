import axios from 'axios';
import { Command } from 'commander';
import { deleteCredentials, loadCredentials } from '../lib/credentials.js';
import { printError, printSuccess } from '../lib/output.js';

export function logoutCommand(): Command {
  return new Command('logout')
    .description('Log out and revoke your session')
    .action(async () => {
      const creds = loadCredentials();
      if (!creds) {
        printError('Not logged in');
        return;
      }
      try {
        await axios.post(`${creds.server}/api/auth/logout`, {
          refresh_token: creds.refresh_token,
        });
      } catch {
        /* best effort */
      }
      deleteCredentials();
      printSuccess('Logged out');
    });
}
