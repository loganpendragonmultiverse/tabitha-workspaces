import { describe, it, expect } from 'vitest';
import { createDefaultState } from './defaults';
import { createCollectionFromTabs } from './library';
import { appendLiveTabs, filterLiveTabs } from './liveCapture';
const tabs = [
  {
    id: 1,
    windowId: 1,
    url: 'https://example.test/a',
    title: 'Research',
    pinned: false,
    active: false,
    index: 0,
  },
  {
    id: 2,
    windowId: 2,
    url: 'https://example.test/a',
    title: 'Duplicate',
    pinned: true,
    active: false,
    index: 1,
  },
  { id: 3, url: 'chrome://settings', title: 'Settings', pinned: false, active: false, index: 2 },
];
describe('live capture', () => {
  it('copies without modifying source, skips restricted URLs, and optionally skips duplicates', () => {
    const state = createDefaultState();
    const collection = createCollectionFromTabs(state, state.workspaces[0]!.id, 'Inbox', []);
    const result = appendLiveTabs(collection, tabs, true);
    expect(result.tabs).toHaveLength(1);
    expect(collection.tabs).toHaveLength(0);
    expect(tabs).toHaveLength(3);
    expect(appendLiveTabs(result, tabs, true)).toBe(result);
    expect(appendLiveTabs(collection, tabs, false).tabs).toHaveLength(2);
  });
  it('filters title and URL and excludes tabs without a usable browser id', () => {
    expect(filterLiveTabs(tabs, 'research').map((t) => t.id)).toEqual([1]);
    expect(filterLiveTabs(tabs, 'example.test')).toHaveLength(2);
    expect(
      filterLiveTabs(
        [{ url: 'https://example.test', title: 'No id', pinned: false, active: false }],
        '',
      ),
    ).toHaveLength(0);
  });
});
