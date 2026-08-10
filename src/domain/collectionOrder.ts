import type { Collection, CollectionSortMode } from './types';

const SORT_MODES = new Set<CollectionSortMode>(['custom', 'newest', 'oldest', 'alphabetical']);

export const isCollectionSortMode = (value: unknown): value is CollectionSortMode =>
  typeof value === 'string' && SORT_MODES.has(value as CollectionSortMode);

const stableNameCompare = (left: Collection, right: Collection): number =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true }) ||
  right.createdAt - left.createdAt ||
  left.id.localeCompare(right.id);

const pinnedFirst = (left: Collection, right: Collection): number =>
  Number(Boolean(right.pinned)) - Number(Boolean(left.pinned));

/** Return a display-only ordering without mutating the persisted collection array. */
export const sortCollections = (
  collections: Collection[],
  mode: CollectionSortMode,
): Collection[] => {
  const sorted = [...collections];
  switch (mode) {
    case 'newest':
      return sorted.sort(
        (left, right) =>
          pinnedFirst(left, right) ||
          right.createdAt - left.createdAt ||
          stableNameCompare(left, right),
      );
    case 'oldest':
      return sorted.sort(
        (left, right) =>
          pinnedFirst(left, right) ||
          left.createdAt - right.createdAt ||
          stableNameCompare(left, right),
      );
    case 'alphabetical':
      return sorted.sort(
        (left, right) => pinnedFirst(left, right) || stableNameCompare(left, right),
      );
    case 'custom':
      return sorted.sort(
        (left, right) =>
          pinnedFirst(left, right) || left.order - right.order || right.createdAt - left.createdAt,
      );
  }
};

/** Insert a captured collection first while preserving every other workspace's order. */
export const insertCollectionAtTop = (
  collections: Collection[],
  created: Collection,
): Collection[] => [
  ...collections.map((item) =>
    item.workspaceId === created.workspaceId && Boolean(item.pinned) === Boolean(created.pinned)
      ? { ...item, order: item.order + 1 }
      : item,
  ),
  { ...created, order: 0 },
];

/** Convert the current visible sequence to persisted custom order, including the requested drop. */
export const reorderVisibleCollections = (
  collections: Collection[],
  draggedId: string,
  targetId: string,
): Collection[] => {
  const reordered = [...collections];
  const from = reordered.findIndex((item) => item.id === draggedId);
  const to = reordered.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to)
    return reordered.map((item, order) => ({ ...item, order }));
  const [dragged] = reordered.splice(from, 1);
  if (!dragged) return reordered.map((item, order) => ({ ...item, order }));
  reordered.splice(to, 0, dragged);
  return reordered.map((item, order) => ({ ...item, order }));
};
