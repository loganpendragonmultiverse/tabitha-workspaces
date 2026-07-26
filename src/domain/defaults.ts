import type { LibraryState, Settings, Workspace } from './types';

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
): Workspace => {
  const now = Date.now();
  return {
    id: createId(),
    name,
    description,
    color: DEFAULT_ACCENT,
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
};

export const createDefaultState = (): LibraryState => {
  const now = Date.now();
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: now,
    workspaces: [createWorkspace()],
    folders: [],
    collections: [],
    links: [],
    notes: [],
    settings: defaultSettings(),
  };
};
