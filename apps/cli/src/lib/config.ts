import Conf from 'conf';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface GphConfig {
  serverUrl: string;
  teamId?: string;
  defaultRepo?: string;
  selectedRepoId?: string;
}

const DEFAULT_SERVER_URL = 'https://api.graphchat.co';

const conf = new Conf<GphConfig>({
  projectName: 'graphchat',
  cwd: join(homedir(), '.graphchat'),
  configName: 'config',
  defaults: {
    serverUrl: DEFAULT_SERVER_URL,
  },
});

export const config = {
  get: <K extends keyof GphConfig>(key: K): GphConfig[K] => {
    if (key === 'serverUrl' && process.env.GRAPHCHAT_SERVER) {
      return process.env.GRAPHCHAT_SERVER as GphConfig[K];
    }
    return conf.get(key);
  },
  set: <K extends keyof GphConfig>(key: K, val: GphConfig[K]) =>
    conf.set(key, val),
  delete: <K extends keyof GphConfig>(key: K) => conf.delete(key),
  getAll: (): GphConfig => conf.store,
  reset: () => conf.clear(),
};
