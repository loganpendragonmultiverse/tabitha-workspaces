import type { Folder, LibraryState, Settings, Workspace } from './types';

export const DEFAULT_ACCENT = '#5b6df8';

export const defaultSettings = (): Settings => ({
  theme: 'system',
  density: 'comfortable',
  accent: DEFAULT_ACCENT,
  confirmBeforeRestore: true,
  deduplicateOnRestore: false,
  restoreInNewWindow: true,
  automaticSnapshots: false,
  snapshotIntervalMinutes: 15,
  sessionLayout: 'cards',
  showWelcomeBanner: true,
  openDashboardOnNewTab: false,
});

export const createId = (): string => crypto.randomUUID();

export const createWorkspace = (
  name = 'My Workspace',
  description = 'Your default place for saved sessions, links, and notes.',
  folderId = '',
): Workspace => {
  const now = Date.now();
  return {
    id: createId(),
    name,
    description,
    color: DEFAULT_ACCENT,
    folderId,
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
};

export const createFolder = (name = 'Personal'): Folder => {
  const now = Date.now();
  return {
    id: createId(),
    name,
    description: 'An isolated home for related workspaces.',
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
};

export const createDefaultState = (): LibraryState => {
  const now = Date.now();
  const folder = createFolder();
  return {
    schemaVersion: 2,
    revision: 0,
    updatedAt: now,
    workspaces: [createWorkspace('My Workspace', undefined, folder.id)],
    folders: [folder],
    collections: [],
    links: [],
    notes: [],
    settings: defaultSettings(),
  };
};
