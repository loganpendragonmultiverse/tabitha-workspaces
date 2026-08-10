import { describe, expect, it } from 'vitest';
import {
  insertCollectionAtTop,
  isCollectionSortMode,
  reorderVisibleCollections,
  sortCollections,
} from './collectionOrder';
import type { Collection } from './types';

const collection = (
  id: string,
  name: string,
  createdAt: number,
  order: number,
  workspaceId = 'workspace-a',
): Collection => ({
  id,
  name,
  createdAt,
  updatedAt: createdAt,
  order,
  workspaceId,
  description: '',
  tags: [],
  tabs: [],
  automatic: false,
});

describe('collection ordering', () => {
  const items = [
    collection('b', '10 Plans', 20, 2),
    collection('c', 'apple', 30, 0),
    collection('a', 'Beta', 10, 1),
  ];

  it('supports custom, newest, oldest, and natural alphabetical display ordering', () => {
    expect(sortCollections(items, 'custom').map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(sortCollections(items, 'newest').map((item) => item.id)).toEqual(['c', 'b', 'a']);
    expect(sortCollections(items, 'oldest').map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(sortCollections(items, 'alphabetical').map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('recognizes only supported persisted sort modes', () => {
    expect(isCollectionSortMode('newest')).toBe(true);
    expect(isCollectionSortMode('alphabetical')).toBe(true);
    expect(isCollectionSortMode('random')).toBe(false);
  });

  it('inserts a captured collection first only within its workspace', () => {
    const other = collection('other', 'Other', 5, 0, 'workspace-b');
    const created = collection('new', 'New', 40, 99);
    const next = insertCollectionAtTop([...items, other], created);
    expect(
      sortCollections(
        next.filter((item) => item.workspaceId === 'workspace-a'),
        'custom',
      ).map((item) => item.id),
    ).toEqual(['new', 'c', 'a', 'b']);
    expect(next.find((item) => item.id === 'other')?.order).toBe(0);
  });

  it('turns the visible sequence into contiguous custom order after a drag', () => {
    const visible = sortCollections(items, 'alphabetical');
    const reordered = reorderVisibleCollections(visible, 'a', 'b');
    expect(reordered.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(reordered.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  it('keeps pinned collections ahead of the selected sort mode', () => {
    const pinned = { ...collection('pin', 'Zebra', 1, 99), pinned: true };
    expect(sortCollections([...items, pinned], 'alphabetical')[0]?.id).toBe('pin');
    expect(sortCollections([...items, pinned], 'custom')[0]?.id).toBe('pin');
  });
});
