import type { Collection, LibraryState } from '../domain/types';

export interface CloudSyncPublicConfig {
  enabled: boolean;
  url: string;
  username: string;
  hasPassword: boolean;
  lastSyncedAt?: number;
  lastError?: string;
}

export type BackgroundRequest =
  | { type: 'open-dashboard'; route?: string }
  | { type: 'capture-window'; workspaceId?: string; name?: string; automatic?: boolean }
  | { type: 'capture-active-link'; workspaceId?: string }
  | { type: 'restore-collection'; collectionId: string }
  | { type: 'open-url'; url: string }
  | { type: 'get-live-tabs' }
  | { type: 'get-cloud-sync-config' }
  | {
      type: 'save-cloud-sync-config';
      config: { enabled: boolean; url: string; username: string; password?: string };
    }
  | { type: 'sync-cloud'; direction: 'auto' | 'upload' | 'download' };

export interface LiveTab {
  id?: number;
  windowId?: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
}

export type BackgroundResponse =
  | {
      ok: true;
      collection?: Collection;
      library?: LibraryState;
      tabs?: LiveTab[];
      syncConfig?: CloudSyncPublicConfig;
      message?: string;
    }
  | { ok: false; error: string };
