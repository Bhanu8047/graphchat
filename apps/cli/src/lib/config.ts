import Conf from 'conf';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface GphConfig {
  serverUrl: string;
  teamId?: string;
  defaultRepo?: string;
}

const conf = new Conf<GphConfig>({
  projectName: 'graphchat',
  cwd: join(homedir(), '.graphchat'),
  configName: 'config',
  defaults: {
    serverUrl: process.env.GRAPHCHAT_SERVER ?? 'http://localhost:3001',
  },
});

export const config = {
  get: <K extends keyof GphConfig>(key: K): GphConfig[K] => conf.get(key),
  set: <K extends keyof GphConfig>(key: K, val: GphConfig[K]) =>
    conf.set(key, val),
  getAll: (): GphConfig => conf.store,
  reset: () => conf.clear(),
};
