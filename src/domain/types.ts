export type EntityKind = 'workspace' | 'folder' | 'collection' | 'link' | 'note';

export interface BaseEntity {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  trashedAt?: number;
}

export interface Workspace extends BaseEntity {
  color: string;
  description: string;
}

export interface Folder extends BaseEntity {
  workspaceId: string;
  description: string;
}

export interface SavedTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  pinned: boolean;
  muted: boolean;
  order: number;
}

export interface Collection extends BaseEntity {
  workspaceId: string;
  folderId?: string;
  description: string;
  tags: string[];
  tabs: SavedTab[];
  lastOpenedAt?: number;
  automatic: boolean;
}

export interface SavedLink extends BaseEntity {
  workspaceId: string;
  folderId?: string;
  url: string;
  description: string;
  tags: string[];
}

export interface Note extends BaseEntity {
  workspaceId: string;
  folderId?: string;
  body: string;
  tags: string[];
}

export type Theme = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export interface Settings {
  theme: Theme;
  density: Density;
  accent: string;
  confirmBeforeRestore: boolean;
  deduplicateOnRestore: boolean;
  restoreInNewWindow: boolean;
  automaticSnapshots: boolean;
  snapshotIntervalMinutes: number;
}

export interface LibraryState {
  schemaVersion: 1;
  revision: number;
  updatedAt: number;
  workspaces: Workspace[];
  folders: Folder[];
  collections: Collection[];
  links: SavedLink[];
  notes: Note[];
  settings: Settings;
}

export interface LibraryExport {
  format: 'tabitha-workspaces';
  exportedAt: string;
  version: 1;
  library: LibraryState;
}

export interface CapturedBrowserTab {
  url?: string;
  title?: string;
  favIconUrl?: string;
  pinned?: boolean;
  mutedInfo?: { muted: boolean };
  index?: number;
}

export interface SearchResult {
  id: string;
  kind: EntityKind | 'tab';
  name: string;
  detail: string;
  workspaceId?: string;
  parentId?: string;
  score: number;
}

export interface RestorePlan {
  urls: string[];
  skippedDuplicates: number;
  skippedRestricted: number;
}
