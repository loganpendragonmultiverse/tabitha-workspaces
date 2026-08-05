import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaults';
import { applyWorkspaceLayout } from './collectionView';
import type { Collection } from './types';

const collection = (id: string, workspaceId: string): Collection => ({
  id,
  workspaceId,
  name: id,
  description: '',
  tags: [],
  tabs: [],
  automatic: false,
  createdAt: 1,
  updatedAt: 1,
  order: 0,
});

describe('collection layout visibility', () => {
  it('expands the selected workspace while preserving collapse state elsewhere', () => {
    const settings = {
      ...defaultSettings(),
      collapsedCollectionIds: ['current-1', 'current-2', 'other-1'],
    };
    const next = applyWorkspaceLayout(
      settings,
      [
        collection('current-1', 'current'),
        collection('current-2', 'current'),
        collection('other-1', 'other'),
      ],
      'current',
      'list',
    );

    expect(next.sessionLayout).toBe('list');
    expect(next.collapsedCollectionIds).toEqual(['other-1']);
    expect(settings.collapsedCollectionIds).toHaveLength(3);
  });
});
