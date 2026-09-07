import { createId } from './defaults';
import { createCollectionFromTabs } from './library';
import type { LibraryState, SavedTab } from './types';

export type UrlReviewMode = 'exact' | 'normalized' | 'ignore-fragment';
export interface DuplicatePreview {
  collectionIds: string[];
  mode: UrlReviewMode;
  signature: string;
  sourceCount: number;
  kept: SavedTab[];
  groups: { url: string; occurrences: { collection: string; title: string; url: string }[] }[];
  workspaceId: string;
}
export const normalizedReviewUrl = (value: string, mode: UrlReviewMode): string => {
  if (mode === 'exact') return value;
  try {
    const url = new URL(value);
    if (mode === 'ignore-fragment') url.hash = '';
    return url.href;
  } catch {
    return value;
  }
};
export const reviewableCollections = (state: LibraryState) =>
  state.collections.filter((c) => {
    const workspace = state.workspaces.find((w) => w.id === c.workspaceId);
    const folder = state.folders.find((f) => f.id === workspace?.folderId);
    return (
      !c.trashedAt && workspace && !workspace.trashedAt && !folder?.trashedAt && !folder?.protection
    );
  });
export const previewDuplicateMerge = (
  state: LibraryState,
  collectionIds: string[],
  mode: UrlReviewMode,
): DuplicatePreview => {
  const ids = new Set(collectionIds);
  const collections = reviewableCollections(state).filter((c) => ids.has(c.id));
  if (!collections.length || collections.length !== ids.size)
    throw new Error('Select existing unprotected collections for review.');
  const groups = new Map<string, DuplicatePreview['groups'][number]>();
  const kept: SavedTab[] = [];
  for (const collection of collections)
    for (const tab of [...collection.tabs].sort((a, b) => a.order - b.order)) {
      const key = normalizedReviewUrl(tab.url, mode);
      if (!groups.has(key)) {
        groups.set(key, { url: key, occurrences: [] });
        kept.push({ ...tab });
      }
      groups
        .get(key)!
        .occurrences.push({ collection: collection.name, title: tab.title, url: tab.url });
    }
  return {
    collectionIds: [...ids],
    mode,
    signature: JSON.stringify(collections),
    sourceCount: collections.reduce((n, c) => n + c.tabs.length, 0),
    kept,
    groups: [...groups.values()].filter((g) => g.occurrences.length > 1),
    workspaceId: collections[0]!.workspaceId,
  };
};
export const applyDuplicateMerge = (
  state: LibraryState,
  preview: DuplicatePreview,
  name: string,
): LibraryState => {
  const current = previewDuplicateMerge(state, preview.collectionIds, preview.mode);
  if (current.signature !== preview.signature)
    throw new Error('Selected collections changed. Generate a fresh preview.');
  if (!name.trim()) throw new Error('Name the merged collection.');
  const collection = createCollectionFromTabs(state, current.workspaceId, name, []);
  collection.tabs = current.kept.map((tab, order) => ({ ...tab, id: createId(), order }));
  collection.description =
    'Created from a reviewed duplicate merge. Original collections are retained; the first occurrence supplies title and flags.';
  return { ...state, collections: [collection, ...state.collections] };
};
