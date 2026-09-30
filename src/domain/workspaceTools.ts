import { createId } from './defaults';
import { insertCollectionAtTop } from './collectionOrder';
import { isRestorableUrl } from './library';
import type { Collection, LibraryState, SavedTab } from './types';

export type TabSort = 'saved' | 'title' | 'domain';
export const availableCollections = (state: LibraryState, workspaceId: string): Collection[] => {
  const workspace = state.workspaces.find((w) => w.id === workspaceId && !w.trashedAt);
  const folder = state.folders.find(
    (f) => f.id === workspace?.folderId && !f.trashedAt && !f.locked,
  );
  return workspace && folder
    ? state.collections.filter((c) => c.workspaceId === workspaceId && !c.trashedAt)
    : [];
};
const domain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};
export const filterSavedTabs = (
  tabs: SavedTab[],
  query: string,
  sort: TabSort = 'saved',
): SavedTab[] => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const result = tabs.filter((t) =>
    words.every((w) => (t.title + ' ' + t.url).toLowerCase().includes(w)),
  );
  return [...result].sort((a, b) =>
    sort === 'saved'
      ? a.order - b.order
      : (sort === 'domain'
          ? domain(a.url).localeCompare(domain(b.url))
          : a.title.localeCompare(b.title)) || a.order - b.order,
  );
};
export const selectedSavedTabs = (collection: Collection, ids?: string[]): SavedTab[] => {
  if (ids === undefined) return [...collection.tabs].sort((a, b) => a.order - b.order);
  const selected = new Set(ids);
  if (!selected.size || [...selected].some((id) => !collection.tabs.some((t) => t.id === id))) {
    throw new Error('The saved-tab selection changed. Select the tabs again.');
  }
  return collection.tabs.filter((t) => selected.has(t.id)).sort((a, b) => a.order - b.order);
};
export const copyCollection = (
  state: LibraryState,
  sourceId: string,
  workspaceId: string,
  expectedUpdatedAt: number,
  ids?: string[],
): LibraryState => {
  const source = state.collections.find((c) => c.id === sourceId);
  if (
    !source ||
    !availableCollections(state, source.workspaceId).some((c) => c.id === sourceId) ||
    !state.workspaces.some(
      (w) =>
        w.id === workspaceId &&
        !w.trashedAt &&
        state.folders.some((f) => f.id === w.folderId && !f.locked && !f.trashedAt),
    )
  ) {
    throw new Error('Unlock the source and destination workspaces before copying.');
  }
  if (source.updatedAt !== expectedUpdatedAt)
    throw new Error('The collection changed. Review it again before copying.');
  const now = Date.now();
  const copy: Collection = {
    ...source,
    id: createId(),
    workspaceId,
    name: source.name + (ids ? ' — selection' : ' — copy'),
    description: source.description,
    tags: [...source.tags],
    tabs: selectedSavedTabs(source, ids).map((t, order) => ({ ...t, id: createId(), order })),
    createdAt: now,
    updatedAt: now,
    order: 0,
    automatic: false,
    pinned: false,
    starred: false,
  };
  delete copy.lastOpenedAt;
  delete copy.folderId;
  delete copy.trashedAt;
  return {
    ...state,
    collections: insertCollectionAtTop(state.collections, copy),
    settings: {
      ...state.settings,
      collectionSortByWorkspace: {
        ...state.settings.collectionSortByWorkspace,
        [workspaceId]: 'custom',
      },
    },
  };
};
const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export const exportCollectionLinks = (
  collection: Collection,
  ids: string[] | undefined,
  format: 'markdown' | 'bookmarks',
): string => {
  const tabs = selectedSavedTabs(collection, ids).filter(
    (t) => /^https?:/.test(t.url) && isRestorableUrl(t.url),
  );
  if (!tabs.length) throw new Error('No HTTP or HTTPS links are available to export.');
  if (format === 'markdown')
    return (
      '# ' +
      escapeHtml(collection.name.replace(/[\r\n]/g, ' ')) +
      '\n\n' +
      tabs
        .map(
          (t) =>
            '- [' +
            escapeHtml(t.title.replace(/[\\[\]\r\n]/g, ' ')) +
            '](<' +
            t.url.replace(/[<>\r\n\\ ]/g, (character) => encodeURIComponent(character)) +
            '>)',
        )
        .join('\n') +
      '\n'
    );
  return (
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Tabitha collection</TITLE>\n<H1>' +
    escapeHtml(collection.name) +
    '</H1>\n<DL><p>\n' +
    tabs
      .map((t) => '<DT><A HREF="' + escapeHtml(t.url) + '">' + escapeHtml(t.title) + '</A>')
      .join('\n') +
    '\n</DL><p>\n'
  );
};
