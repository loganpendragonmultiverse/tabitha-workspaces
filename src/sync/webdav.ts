import { parseLibraryExport, serializeLibrary } from '../domain/importExport';
import type { LibraryState } from '../domain/types';
import type { CloudSyncConfig } from '../storage/cloudSyncStore';

export type SyncDirection = 'auto' | 'upload' | 'download';
export interface SyncResult {
  library: LibraryState;
  action: 'uploaded' | 'downloaded' | 'unchanged';
  fingerprint: string;
  etag?: string;
}

interface RemoteLibrary {
  library: LibraryState;
  fingerprint: string;
  etag?: string;
  lastModified?: string;
}

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

export const libraryFingerprint = async (library: LibraryState): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(library)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const conflict = (): Error =>
  new Error(
    'Sync conflict: this browser and the WebDAV backup both changed. Download the remote copy or export local folder backups before choosing which version to keep.',
  );

const upload = async (
  config: CloudSyncConfig,
  library: LibraryState,
  remote: RemoteLibrary | null,
): Promise<string | undefined> => {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (!remote) headers.set('If-None-Match', '*');
  else if (remote.etag) headers.set('If-Match', remote.etag);
  else if (remote.lastModified) headers.set('If-Unmodified-Since', remote.lastModified);
  else {
    throw new Error(
      'Safe upload is unavailable because this WebDAV server returned no ETag or Last-Modified validator.',
    );
  }
  const response = await request(config, {
    method: 'PUT',
    headers,
    body: serializeLibrary(library),
  });
  if (response.status === 409 || response.status === 412) throw conflict();
  if (!response.ok)
    throw new Error(`WebDAV upload failed (${response.status} ${response.statusText}).`);
  return response.headers.get('ETag') ?? undefined;
};

const download = async (config: CloudSyncConfig): Promise<RemoteLibrary | null> => {
  const response = await request(config, { method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`WebDAV download failed (${response.status} ${response.statusText}).`);
  const library = parseLibraryExport(await response.text());
  const etag = response.headers.get('ETag');
  return {
    library,
    fingerprint: await libraryFingerprint(library),
    ...(etag && !etag.startsWith('W/') ? { etag } : {}),
    ...(response.headers.get('Last-Modified')
      ? { lastModified: response.headers.get('Last-Modified')! }
      : {}),
  };
};

export const synchronizeWebDav = async (
  config: CloudSyncConfig,
  local: LibraryState,
  direction: SyncDirection,
): Promise<SyncResult> => {
  validateUrl(config.url);
  const remote = await download(config);
  const localFingerprint = await libraryFingerprint(local);
  if (direction === 'download') {
    if (!remote) throw new Error('No Tabitha backup exists at that WebDAV URL yet.');
    return {
      library: remote.library,
      action: 'downloaded',
      fingerprint: remote.fingerprint,
      ...(remote.etag ? { etag: remote.etag } : {}),
    };
  }

  if (!remote) {
    const etag = await upload(config, local, null);
    return {
      library: local,
      action: 'uploaded',
      fingerprint: localFingerprint,
      ...(etag ? { etag } : {}),
    };
  }
  if (remote.fingerprint === localFingerprint) {
    return {
      library: local,
      action: 'unchanged',
      fingerprint: localFingerprint,
      ...(remote.etag ? { etag: remote.etag } : {}),
    };
  }

  const base = config.lastSyncedFingerprint;
  if (!base) {
    if (direction === 'auto' && local.revision === 0) {
      return {
        library: remote.library,
        action: 'downloaded',
        fingerprint: remote.fingerprint,
        ...(remote.etag ? { etag: remote.etag } : {}),
      };
    }
    throw conflict();
  }

  const localChanged = localFingerprint !== base;
  const remoteChanged = remote.fingerprint !== base;
  if (localChanged && remoteChanged) throw conflict();
  if (remoteChanged) {
    if (direction === 'upload') throw conflict();
    return {
      library: remote.library,
      action: 'downloaded',
      fingerprint: remote.fingerprint,
      ...(remote.etag ? { etag: remote.etag } : {}),
    };
  }
  if (localChanged) {
    const etag = await upload(config, local, remote);
    return {
      library: local,
      action: 'uploaded',
      fingerprint: localFingerprint,
      ...(etag ? { etag } : remote.etag ? { etag: remote.etag } : {}),
    };
  }
  throw conflict();
};
