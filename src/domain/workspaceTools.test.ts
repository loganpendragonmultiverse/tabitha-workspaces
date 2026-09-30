import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaults';
import { createCollectionFromTabs } from './library';
import {
  availableCollections,
  savedDomains,
  copyableUrls,
  removeSelectedTabs,
  undoTabRemoval,
  copyCollection,
  exportCollectionLinks,
  filterSavedTabs,
  selectedSavedTabs,
} from './workspaceTools';
const fixture = () => {
  const state = createDefaultState();
  const w = state.workspaces[0]!;
  const collection = createCollectionFromTabs(state, w.id, 'Research', [
    { url: 'https://b.test/?token=private', title: 'Z title', pinned: true },
    { url: 'https://a.test', title: 'A <script> & [test]' },
  ]);
  collection.tags = ['research'];
  collection.description = 'Private note';
  state.collections = [collection];
  return { state, collection, w };
};
describe('collection tools', () => {
  it('filters words across title and URL without modifying saved order', () => {
    const { collection } = fixture();
    const original = structuredClone(collection);
    expect(filterSavedTabs(collection.tabs, 'b.test Z')).toHaveLength(1);
    expect(filterSavedTabs(collection.tabs, '', 'domain')[0]?.url).toBe('https://a.test');
    expect(filterSavedTabs(collection.tabs, '', 'title')[0]?.url).toBe('https://a.test');
    expect(collection).toEqual(original);
    expect(filterSavedTabs(collection.tabs, 'absent')).toEqual([]);
  });
  it('keeps selections in saved order and refuses stale or empty selections', () => {
    const { collection } = fixture();
    expect(selectedSavedTabs(collection, collection.tabs.map((t) => t.id).reverse())).toEqual(
      collection.tabs,
    );
    expect(() => selectedSavedTabs(collection, [])).toThrow();
    expect(() => selectedSavedTabs(collection, ['missing'])).toThrow();
  });
  it('creates independent copies, preserving metadata and originals', () => {
    const { state, collection, w } = fixture();
    const original = structuredClone(state);
    const next = copyCollection(state, collection.id, w.id, collection.updatedAt);
    const copy = next.collections.find((c) => c.id !== collection.id)!;
    expect(state).toEqual(original);
    expect(copy.tabs[0]?.pinned).toBe(true);
    expect(copy.tabs.map((t) => t.id)).not.toEqual(collection.tabs.map((t) => t.id));
    expect(copy.tags).toEqual(collection.tags);
    expect(copy.tags).not.toBe(collection.tags);
    expect(copy.automatic).toBe(false);
    expect(copy.lastOpenedAt).toBeUndefined();
    expect(copy.name).toContain('copy');
    expect(next.settings.collectionSortByWorkspace[w.id]).toBe('custom');
  });
  it('copies a selected subset only and refuses changed source data', () => {
    const { state, collection, w } = fixture();
    expect(
      copyCollection(state, collection.id, w.id, collection.updatedAt, [
        collection.tabs[1]!.id,
      ]).collections.find((c) => c.id !== collection.id)?.tabs,
    ).toHaveLength(1);
    expect(() => copyCollection(state, collection.id, w.id, -1)).toThrow('changed');
  });
  it('excludes trash and locked folders and refuses missing destinations', () => {
    const { state, collection, w } = fixture();
    expect(() => copyCollection(state, collection.id, 'missing', collection.updatedAt)).toThrow();
    state.folders[0]!.locked = true;
    expect(availableCollections(state, w.id)).toEqual([]);
    expect(() => copyCollection(state, collection.id, w.id, collection.updatedAt)).toThrow();
    state.folders[0]!.locked = false;
    collection.trashedAt = 1;
    expect(availableCollections(state, w.id)).toEqual([]);
    expect(() => copyCollection(state, collection.id, w.id, collection.updatedAt)).toThrow();
  });
  it('exports safe bookmark markup and Markdown with no notes or credentials', () => {
    const { collection } = fixture();
    const html = exportCollectionLinks(collection, undefined, 'bookmarks');
    expect(html).toContain('&lt;script&gt; &amp;');
    expect(html).not.toContain('Private note');
    expect(html).not.toContain('<script>');
    expect(exportCollectionLinks(collection, undefined, 'markdown')).not.toContain('<script>');
    collection.name = '<img src=x onerror=alert(1)>';
    expect(exportCollectionLinks(collection, undefined, 'markdown')).toContain('&lt;img');
    collection.name = 'Research';
    expect(exportCollectionLinks(collection, [collection.tabs[0]!.id], 'markdown')).toContain(
      'https://b.test/?token=private',
    );
    expect(exportCollectionLinks(collection, undefined, 'markdown')).toContain('# Research');
    collection.tabs = [{ ...collection.tabs[0]!, url: 'javascript:alert(1)' }];
    expect(() => exportCollectionLinks(collection, undefined, 'bookmarks')).toThrow('No HTTP');
  });
  it('does not expose collections whose parent workspace or folder is trashed', () => {
    const { state, w } = fixture();
    w.trashedAt = 1;
    expect(availableCollections(state, w.id)).toEqual([]);
    delete w.trashedAt;
    state.folders[0]!.trashedAt = 1;
    expect(availableCollections(state, w.id)).toEqual([]);
  });
});

describe('reviewed saved-tab actions', () => {
  it('filters an exact hostname, preserving paths, queries and saved order', () => {
    const { collection } = fixture();
    collection.tabs.push({
      ...collection.tabs[0]!,
      id: 'other',
      url: 'https://sub.b.test/path',
      order: 2,
    });
    const before = structuredClone(collection);
    expect(savedDomains(collection.tabs)).toEqual(['a.test', 'b.test', 'sub.b.test']);
    expect(filterSavedTabs(collection.tabs, '', 'saved', 'b.test').map((t) => t.url)).toEqual([
      'https://b.test/?token=private',
    ]);
    expect(filterSavedTabs(collection.tabs, 'absent', 'domain', 'b.test')).toEqual([]);
    expect(collection).toEqual(before);
    expect(savedDomains([{ ...collection.tabs[0]!, url: 'bad' }])).toEqual([]);
  });
  it('copies selected full HTTP URLs in saved order and refuses unsafe or stale selections', () => {
    const { collection } = fixture();
    expect(copyableUrls(collection, collection.tabs.map((t) => t.id).reverse())).toBe(
      'https://b.test/?token=private\nhttps://a.test',
    );
    expect(() => copyableUrls(collection, ['missing'])).toThrow();
    collection.tabs = [{ ...collection.tabs[0]!, url: 'javascript:alert(1)' }];
    expect(() => copyableUrls(collection, [collection.tabs[0]!.id])).toThrow('No HTTP');
  });
  it('removes and restores a subset with original identity, order and metadata', () => {
    const { state, collection } = fixture();
    const before = structuredClone(state);
    const removed = removeSelectedTabs(state, collection.id, collection.tabs, [
      collection.tabs[0]!.id,
    ]);
    expect(state).toEqual(before);
    expect(removed.state.collections[0]!.tabs).toEqual([{ ...collection.tabs[1]!, order: 0 }]);
    removed.state.collections[0]!.name = 'Renamed after removal';
    const restored = undoTabRemoval(removed.state, removed.undo);
    expect(restored.collections[0]!.tabs).toEqual(collection.tabs);
    expect(restored.collections[0]!.name).toBe('Renamed after removal');
    expect(restored.collections[0]!.tags).toEqual(collection.tags);
    expect(restored.collections[0]!.tabs).not.toBe(removed.undo.before);
  });
  it('supports removing all tabs without deleting the collection', () => {
    const { state, collection } = fixture();
    const removed = removeSelectedTabs(
      state,
      collection.id,
      collection.tabs,
      collection.tabs.map((t) => t.id),
    );
    expect(removed.state.collections).toHaveLength(1);
    expect(removed.state.collections[0]!.tabs).toEqual([]);
    expect(undoTabRemoval(removed.state, removed.undo).collections[0]!.tabs).toEqual(
      collection.tabs,
    );
  });
  it('refuses stale removals, empty selections and Undo after tab edits', () => {
    const { state, collection } = fixture();
    expect(() => removeSelectedTabs(state, collection.id, [], [collection.tabs[0]!.id])).toThrow(
      'changed',
    );
    expect(() => removeSelectedTabs(state, collection.id, collection.tabs, [])).toThrow();
    const removed = removeSelectedTabs(state, collection.id, collection.tabs, [
      collection.tabs[0]!.id,
    ]);
    removed.state.collections[0]!.tabs[0]!.title = 'New title';
    expect(() => undoTabRemoval(removed.state, removed.undo)).toThrow('newer edits');
  });
  it('refuses locked, trashed and missing collections for removal and Undo', () => {
    const { state, collection } = fixture();
    const removed = removeSelectedTabs(state, collection.id, collection.tabs, [
      collection.tabs[0]!.id,
    ]);
    for (const unavailable of [
      { ...state, collections: [] },
      { ...state, collections: state.collections.map((c) => ({ ...c, trashedAt: 1 })) },
      { ...state, folders: state.folders.map((f) => ({ ...f, locked: true })) },
      { ...state, workspaces: state.workspaces.map((w) => ({ ...w, trashedAt: 1 })) },
    ]) {
      expect(() =>
        removeSelectedTabs(unavailable, collection.id, collection.tabs, [collection.tabs[0]!.id]),
      ).toThrow('unavailable');
      expect(() => undoTabRemoval(unavailable, removed.undo)).toThrow('unavailable');
    }
  });
});
