import { createId, defaultSettings } from './defaults';
import { isCollectionSortMode } from './collectionOrder';
import type {
  CapturedBrowserTab,
  Collection,
  EntityKind,
  BaseEntity,
  Folder,
  LibraryState,
  RestorePlan,
  SavedTab,
  SearchScope,
  SearchResult,
} from './types';

const RESTORABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:', 'ftp:']);

export const normalizeTags = (tags: string[] | string): string[] => {
  const values = Array.isArray(tags) ? tags : tags.split(',');
  return [...new Set(values.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort();
};

export const isRestorableUrl = (value: string): boolean => {
  try {
    return RESTORABLE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const captureTabs = (tabs: CapturedBrowserTab[]): SavedTab[] =>
  tabs
    .filter((tab): tab is CapturedBrowserTab & { url: string } =>
      Boolean(tab.url && isRestorableUrl(tab.url)),
    )
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
    .map((tab, index) => ({
      id: createId(),
      url: tab.url,
      title: tab.title?.trim() || new URL(tab.url).hostname || tab.url,
      ...(tab.favIconUrl ? { faviconUrl: tab.favIconUrl } : {}),
      pinned: Boolean(tab.pinned),
      muted: Boolean(tab.mutedInfo?.muted),
      order: index,
    }));

export const createCollectionFromTabs = (
  state: LibraryState,
  workspaceId: string,
  name: string,
  tabs: CapturedBrowserTab[],
  automatic = false,
): Collection => {
  const now = Date.now();
  return {
    id: createId(),
    name: name.trim() || `Collection ${new Date(now).toLocaleString()}`,
    workspaceId,
    description: '',
    tags: automatic ? ['recovery'] : [],
    tabs: captureTabs(tabs),
    automatic,
    pinned: false,
    starred: false,
    createdAt: now,
    updatedAt: now,
    order: state.collections.filter((item) => item.workspaceId === workspaceId).length,
  };
};

export const createRestorePlan = (
  tabs: SavedTab[],
  openUrls: string[],
  deduplicate: boolean,
): RestorePlan => {
  const seen = new Set(openUrls);
  const urls: string[] = [];
  let skippedDuplicates = 0;
  let skippedRestricted = 0;

  for (const tab of [...tabs].sort((left, right) => left.order - right.order)) {
    if (!isRestorableUrl(tab.url)) {
      skippedRestricted += 1;
    } else if (deduplicate && seen.has(tab.url)) {
      skippedDuplicates += 1;
    } else {
      urls.push(tab.url);
      seen.add(tab.url);
    }
  }

  return { urls, skippedDuplicates, skippedRestricted };
};

export const extractWikiLinks = (body: string): string[] => {
  const names = [...body.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((match) => match[1]?.trim() ?? '');
  return [...new Set(names.filter(Boolean))];
};

export const noteBacklinks = (state: LibraryState, noteName: string): string[] =>
  state.notes
    .filter((note) => !note.trashedAt && extractWikiLinks(note.body).includes(noteName))
    .map((note) => note.id);

const scoreText = (query: string, name: string, detail: string): number => {
  const normalizedName = name.toLowerCase();
  const normalizedDetail = detail.toLowerCase();
  if (normalizedName === query) return 100;
  if (normalizedName.startsWith(query)) return 80;
  if (normalizedName.includes(query)) return 60;
  if (normalizedDetail.includes(query)) return 30;
  return 0;
};

export const searchLibrary = (
  state: LibraryState,
  input: string,
  scope: SearchScope = 'all',
): SearchResult[] => {
  const query = input.trim().toLowerCase();
  if (!query) return [];
  const results: SearchResult[] = [];
  const add = (result: Omit<SearchResult, 'score'>): void => {
    if (scope === 'workspace' && result.kind !== 'workspace') return;
    if (scope === 'collection' && result.kind !== 'collection') return;
    if (scope === 'url' && result.kind !== 'tab' && result.kind !== 'link') return;
    const score = scoreText(query, result.name, result.detail);
    if (score > 0) results.push({ ...result, score });
  };

  state.workspaces
    .filter((item) => !item.trashedAt)
    .forEach((item) =>
      add({ id: item.id, kind: 'workspace', name: item.name, detail: item.description }),
    );
  state.folders
    .filter((item) => !item.trashedAt)
    .forEach((item) =>
      add({
        id: item.id,
        kind: 'folder',
        name: item.name,
        detail: item.description,
      }),
    );
  state.collections
    .filter((item) => !item.trashedAt)
    .forEach((item) => {
      add({
        id: item.id,
        kind: 'collection',
        name: item.name,
        detail: `${item.description} ${item.tags.join(' ')}`,
        workspaceId: item.workspaceId,
      });
      item.tabs.forEach((tab) =>
        add({
          id: tab.id,
          kind: 'tab',
          name: tab.title,
          detail: tab.url,
          url: tab.url,
          workspaceId: item.workspaceId,
          parentId: item.id,
        }),
      );
    });
  state.links
    .filter((item) => !item.trashedAt)
    .forEach((item) =>
      add({
        id: item.id,
        kind: 'link',
        name: item.name,
        detail: `${item.url} ${item.description} ${item.tags.join(' ')}`,
        url: item.url,
        workspaceId: item.workspaceId,
      }),
    );
  state.notes
    .filter((item) => !item.trashedAt)
    .forEach((item) =>
      add({
        id: item.id,
        kind: 'note',
        name: item.name,
        detail: `${item.body} ${item.tags.join(' ')}`,
        workspaceId: item.workspaceId,
      }),
    );
  return results.sort(
    (left, right) => right.score - left.score || left.name.localeCompare(right.name),
  );
};

export const reorderEntities = <T extends { id: string; order: number }>(
  entities: T[],
  draggedId: string,
  targetId: string,
): T[] => {
  const sorted = [...entities].sort((left, right) => left.order - right.order);
  const from = sorted.findIndex((item) => item.id === draggedId);
  const to = sorted.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return entities;
  const [dragged] = sorted.splice(from, 1);
  if (!dragged) return entities;
  sorted.splice(to, 0, dragged);
  return sorted.map((item, order) => ({ ...item, order }));
};

export const updateSavedTab = (
  collection: Collection,
  tabId: string,
  change: Partial<Pick<SavedTab, 'title' | 'url'>>,
): Collection => ({
  ...collection,
  tabs: collection.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...change } : tab)),
});

export const removeSavedTab = (collection: Collection, tabId: string): Collection => ({
  ...collection,
  tabs: collection.tabs.filter((tab) => tab.id !== tabId).map((tab, order) => ({ ...tab, order })),
});

export const normalizeLibrary = (candidate: LibraryState): LibraryState => {
  if (
    ![1, 2, 3].includes(Number(candidate.schemaVersion)) ||
    !Array.isArray(candidate.workspaces)
  ) {
    throw new Error('This backup uses an unsupported Tabitha Workspaces format.');
  }
  const hasProtectedFolder = Array.isArray(candidate.folders)
    ? candidate.folders.some((folder) => Boolean(folder.protection))
    : false;
  if (candidate.workspaces.length === 0 && !hasProtectedFolder) {
    throw new Error('A library must contain at least one workspace.');
  }
  const now = Date.now();
  const isLegacy = Number(candidate.schemaVersion) === 1;
  const migratedFolder: Folder = {
    id: `folder-${crypto.randomUUID()}`,
    name: 'Personal',
    description: 'Migrated home for your existing workspaces.',
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
  const folders = isLegacy
    ? [migratedFolder]
    : Array.isArray(candidate.folders)
      ? candidate.folders
      : [];
  const fallbackFolder = folders.find((item) => !item.trashedAt) ?? migratedFolder;
  if (folders.length === 0) folders.push(fallbackFolder);
  const workspaces = candidate.workspaces.map((item) => ({
    ...item,
    folderId: isLegacy ? migratedFolder.id : item.folderId || fallbackFolder.id,
  }));
  const activeWorkspaceIds = new Set(
    workspaces.filter((item) => !item.trashedAt).map((item) => item.id),
  );
  const requestedHomeWorkspaceId = candidate.settings?.homeWorkspaceId;
  const homeWorkspaceId =
    requestedHomeWorkspaceId && activeWorkspaceIds.has(requestedHomeWorkspaceId)
      ? requestedHomeWorkspaceId
      : (workspaces.find((item) => !item.trashedAt)?.id ?? '');
  const requestedSelectedWorkspaceId = candidate.settings?.selectedWorkspaceId;
  const selectedWorkspaceId =
    requestedSelectedWorkspaceId && activeWorkspaceIds.has(requestedSelectedWorkspaceId)
      ? requestedSelectedWorkspaceId
      : homeWorkspaceId;
  return {
    ...candidate,
    schemaVersion: 3,
    revision: Number.isFinite(candidate.revision) ? candidate.revision : 0,
    updatedAt: Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : Date.now(),
    workspaces,
    folders,
    collections: Array.isArray(candidate.collections) ? candidate.collections : [],
    links: Array.isArray(candidate.links) ? candidate.links : [],
    notes: Array.isArray(candidate.notes) ? candidate.notes : [],
    settings: {
      ...defaultSettings(),
      ...candidate.settings,
      collectionSortByWorkspace: Object.fromEntries(
        Object.entries(candidate.settings?.collectionSortByWorkspace ?? {}).filter(
          ([workspaceId, mode]) => workspaceId.length > 0 && isCollectionSortMode(mode),
        ),
      ),
      collapsedCollectionIds: Array.isArray(candidate.settings?.collapsedCollectionIds)
        ? [
            ...new Set(
              candidate.settings.collapsedCollectionIds.filter((id) => typeof id === 'string'),
            ),
          ]
        : [],
      collapsedFolderIds: Array.isArray(candidate.settings?.collapsedFolderIds)
        ? [...new Set(candidate.settings.collapsedFolderIds.filter((id) => typeof id === 'string'))]
        : [],
      homeWorkspaceId,
      selectedWorkspaceId,
    },
  };
};

export const markTrashed = (state: LibraryState, kind: EntityKind, id: string): LibraryState => {
  const now = Date.now();
  const mark = <T extends BaseEntity>(items: T[]): T[] =>
    items.map((item) => (item.id === id ? { ...item, trashedAt: now, updatedAt: now } : item));
  switch (kind) {
    case 'workspace':
      return { ...state, workspaces: mark(state.workspaces) };
    case 'folder':
      return {
        ...state,
        folders: mark(state.folders),
        workspaces: state.workspaces.map((item) =>
          item.folderId === id ? { ...item, trashedAt: now, updatedAt: now } : item,
        ),
      };
    case 'collection':
      return { ...state, collections: mark(state.collections) };
    case 'link':
      return { ...state, links: mark(state.links) };
    case 'note':
      return { ...state, notes: mark(state.notes) };
  }
};

export const restoreTrashed = (state: LibraryState, kind: EntityKind, id: string): LibraryState => {
  const now = Date.now();
  const restore = <T extends BaseEntity>(items: T[]): T[] =>
    items.map((item) => {
      if (item.id !== id) return item;
      const restored = { ...item };
      delete restored.trashedAt;
      restored.updatedAt = now;
      return restored;
    });
  switch (kind) {
    case 'workspace':
      return { ...state, workspaces: restore(state.workspaces) };
    case 'folder':
      return {
        ...state,
        folders: restore(state.folders),
        workspaces: state.workspaces.map((item) => {
          if (item.folderId !== id) return item;
          const restoredItem = { ...item };
          delete restoredItem.trashedAt;
          restoredItem.updatedAt = now;
          return restoredItem;
        }),
      };
    case 'collection':
      return { ...state, collections: restore(state.collections) };
    case 'link':
      return { ...state, links: restore(state.links) };
    case 'note':
      return { ...state, notes: restore(state.notes) };
  }
};

export const purgeTrash = (state: LibraryState): LibraryState => {
  const directlyRemovedFolderIds = new Set(
    state.folders.filter((item) => item.trashedAt).map((item) => item.id),
  );
  const removedWorkspaceIds = new Set(
    state.workspaces
      .filter((item) => item.trashedAt || directlyRemovedFolderIds.has(item.folderId))
      .map((item) => item.id),
  );
  return {
    ...state,
    workspaces: state.workspaces.filter(
      (item) => !item.trashedAt && !directlyRemovedFolderIds.has(item.folderId),
    ),
    folders: state.folders.filter((item) => !item.trashedAt),
    collections: state.collections.filter(
      (item) => !item.trashedAt && !removedWorkspaceIds.has(item.workspaceId),
    ),
    links: state.links.filter(
      (item) => !item.trashedAt && !removedWorkspaceIds.has(item.workspaceId),
    ),
    notes: state.notes.filter(
      (item) => !item.trashedAt && !removedWorkspaceIds.has(item.workspaceId),
    ),
  };
};
