import { storage } from 'wxt/utils/storage';
import type { CloudSyncPublicConfig } from '../browser/messages';

export interface CloudSyncConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  lastSyncedAt?: number;
  lastError?: string;
}

const emptyConfig = (): CloudSyncConfig => ({
  enabled: false,
  url: '',
  username: '',
  password: '',
});

export const cloudSyncItem = storage.defineItem<CloudSyncConfig>('local:cloud-sync-v1', {
  version: 1,
  fallback: emptyConfig(),
});

export const getCloudSyncConfig = (): Promise<CloudSyncConfig> => cloudSyncItem.getValue();

export const setCloudSyncConfig = async (
  next: Omit<CloudSyncConfig, 'password' | 'lastError'> & {
    password?: string;
    lastError?: string | null;
  },
): Promise<CloudSyncConfig> => {
  const current = await getCloudSyncConfig();
  const { lastError, ...values } = next;
  const config: CloudSyncConfig = {
    ...current,
    ...values,
    password: next.password || current.password,
  };
  if (lastError === null) delete config.lastError;
  else if (lastError) config.lastError = lastError;
  await cloudSyncItem.setValue(config);
  return config;
};

export const publicCloudSyncConfig = (config: CloudSyncConfig): CloudSyncPublicConfig => ({
  enabled: config.enabled,
  url: config.url,
  username: config.username,
  hasPassword: Boolean(config.password),
  ...(config.lastSyncedAt ? { lastSyncedAt: config.lastSyncedAt } : {}),
  ...(config.lastError ? { lastError: config.lastError } : {}),
});
