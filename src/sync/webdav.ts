import { parseLibraryExport, serializeLibrary } from '../domain/importExport';
import type { LibraryState } from '../domain/types';
import type { CloudSyncConfig } from '../storage/cloudSyncStore';

export type SyncDirection = 'auto' | 'upload' | 'download';

const authorization = (username: string, password: string): string => {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return `Basic ${btoa(binary)}`;
};

const validateUrl = (value: string): URL => {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Cloud sync requires an HTTPS WebDAV URL.');
  return url;
};

const request = (config: CloudSyncConfig, init: RequestInit): Promise<Response> => {
  const url = validateUrl(config.url);
  const headers = new Headers(init.headers);
  if (config.username || config.password)
    headers.set('Authorization', authorization(config.username, config.password));
  return fetch(url, { ...init, headers, cache: 'no-store' });
};

const upload = async (config: CloudSyncConfig, library: LibraryState): Promise<void> => {
  const response = await request(config, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: serializeLibrary(library),
  });
  if (!response.ok)
    throw new Error(`WebDAV upload failed (${response.status} ${response.statusText}).`);
};

const download = async (config: CloudSyncConfig): Promise<LibraryState | null> => {
  const response = await request(config, { method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`WebDAV download failed (${response.status} ${response.statusText}).`);
  return parseLibraryExport(await response.text());
};

export const synchronizeWebDav = async (
  config: CloudSyncConfig,
  local: LibraryState,
  direction: SyncDirection,
): Promise<{ library: LibraryState; action: 'uploaded' | 'downloaded' | 'unchanged' }> => {
  validateUrl(config.url);
  if (direction === 'upload') {
    await upload(config, local);
    return { library: local, action: 'uploaded' };
  }

  const remote = await download(config);
  if (direction === 'download') {
    if (!remote) throw new Error('No Tabitha backup exists at that WebDAV URL yet.');
    return { library: remote, action: 'downloaded' };
  }

  if (!remote || local.updatedAt > remote.updatedAt) {
    await upload(config, local);
    return { library: local, action: 'uploaded' };
  }
  if (remote.updatedAt > local.updatedAt) return { library: remote, action: 'downloaded' };
  return { library: local, action: 'unchanged' };
};
