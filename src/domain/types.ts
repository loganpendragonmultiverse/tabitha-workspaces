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
  folderId: string;
  pinned?: boolean;
  starred?: boolean;
}

export interface Folder extends BaseEntity {
  description: string;
  protection?: FolderProtection;
  /** Runtime-only state. This flag is removed before the library is persisted. */
  locked?: boolean;
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

export interface FolderProtection {
  version: 1;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  vault: EncryptedPayload;
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
  pinned?: boolean;
  starred?: boolean;
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
export type SessionLayout = 'cards' | 'compact' | 'list';
export type CollectionSortMode = 'custom' | 'newest' | 'oldest' | 'alphabetical';
export type SearchScope = 'all' | 'workspace' | 'collection' | 'url';

export interface Settings {
  theme: Theme;
  density: Density;
  accent: string;
  confirmBeforeRestore: boolean;
  deduplicateOnRestore: boolean;
  restoreInNewWindow: boolean;
  automaticSnapshots: boolean;
  snapshotIntervalMinutes: number;
  sessionLayout: SessionLayout;
  collectionSortByWorkspace: Record<string, CollectionSortMode>;
  collapsedCollectionIds: string[];
  collapsedFolderIds: string[];
  homeWorkspaceId: string;
  selectedWorkspaceId: string;
  showWelcomeBanner: boolean;
  openDashboardOnNewTab: boolean;
}

export interface LibraryState {
  schemaVersion: 3;
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
  version: 3;
  library: LibraryState;
}

export interface FolderExport {
  format: 'tabitha-workspaces-folder';
  exportedAt: string;
  version: 1;
  folder: Folder;
  workspaces: Workspace[];
  collections: Collection[];
  links: SavedLink[];
  notes: Note[];
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
  url?: string;
  score: number;
}

export interface RestorePlan {
  urls: string[];
  skippedDuplicates: number;
  skippedRestricted: number;
}
