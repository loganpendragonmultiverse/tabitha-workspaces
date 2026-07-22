import type { Collection, LibraryState } from '../domain/types';

export type BackgroundRequest =
  | { type: 'open-dashboard'; route?: string }
  | { type: 'capture-window'; workspaceId?: string; name?: string; automatic?: boolean }
  | { type: 'capture-active-link'; workspaceId?: string }
  | { type: 'restore-collection'; collectionId: string }
  | { type: 'get-live-tabs' };

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
      message?: string;
    }
  | { ok: false; error: string };
