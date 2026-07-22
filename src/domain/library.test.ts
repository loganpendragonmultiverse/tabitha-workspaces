import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaults';
import { parseLibraryExport, serializeLibrary } from './importExport';
import {
  captureTabs,
  createCollectionFromTabs,
  createRestorePlan,
  extractWikiLinks,
  isRestorableUrl,
  markTrashed,
  normalizeLibrary,
  normalizeTags,
  noteBacklinks,
  purgeTrash,
  reorderEntities,
  restoreTrashed,
  searchLibrary,
} from './library';
import type { Collection, LibraryState, Note, SavedLink } from './types';

const fixture = (): LibraryState => {
  const state = createDefaultState();
  const workspaceId = state.workspaces[0]!.id;
  const collection: Collection = {
    id: 'collection-1',
    workspaceId,
    name: 'Research session',
    description: 'Browser compatibility research',
    tags: ['firefox'],
    tabs: [
      {
        id: 'tab-1',
        title: 'Mozilla WebExtensions',
        url: 'https://developer.mozilla.org/extensions',
        pinned: false,
        muted: false,
        order: 0,
      },
      { id: 'tab-2', title: 'WXT', url: 'https://wxt.dev', pinned: true, muted: false, order: 1 },
    ],
    automatic: false,
    createdAt: 1,
    updatedAt: 2,
    order: 0,
  };
  const link: SavedLink = {
    id: 'link-1',
    workspaceId,
    name: 'Firefox docs',
    url: 'https://developer.mozilla.org',
    description: 'Official browser documentation',
    tags: ['docs'],
    createdAt: 1,
    updatedAt: 2,
    order: 0,
  };
  const notes: Note[] = [
    {
      id: 'note-1',
      workspaceId,
      name: 'Release checklist',
      body: 'Test [[Firefox]] and Chromium.',
      tags: ['release'],
      createdAt: 1,
      updatedAt: 2,
      order: 0,
    },
    {
      id: 'note-2',
      workspaceId,
      name: 'Firefox',
      body: 'Review AMO policy.',
      tags: [],
      createdAt: 1,
      updatedAt: 2,
      order: 1,
    },
  ];
  return { ...state, collections: [collection], links: [link], notes };
};

describe('tag and URL normalization', () => {
  it('normalizes, deduplicates, and sorts tags', () => {
    expect(normalizeTags(' Beta,alpha,beta, ')).toEqual(['alpha', 'beta']);
    expect(normalizeTags(['One', ' two '])).toEqual(['one', 'two']);
  });

  it('allows normal browser URLs and rejects privileged or malformed URLs', () => {
    expect(isRestorableUrl('https://example.com')).toBe(true);
    expect(isRestorableUrl('file:///C:/notes.txt')).toBe(true);
    expect(isRestorableUrl('chrome://settings')).toBe(false);
    expect(isRestorableUrl('not a url')).toBe(false);
  });
});

describe('tab capture and restoration', () => {
  it('captures supported tabs in browser order', () => {
    const tabs = captureTabs([
      { url: 'chrome://settings', title: 'Settings', index: 0 },
      { url: 'https://second.example', title: '', index: 2, pinned: true },
      { url: 'https://first.example', title: 'First', index: 1, mutedInfo: { muted: true } },
    ]);
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toMatchObject({ title: 'First', muted: true, order: 0 });
    expect(tabs[1]).toMatchObject({ title: 'second.example', pinned: true, order: 1 });
  });

  it('creates named manual and automatic collections', () => {
    const state = createDefaultState();
    const manual = createCollectionFromTabs(state, state.workspaces[0]!.id, '  Reading  ', [
      { url: 'https://example.com' },
    ]);
    const automatic = createCollectionFromTabs(
      state,
      state.workspaces[0]!.id,
      'Recovery',
      [],
      true,
    );
    expect(manual.name).toBe('Reading');
    expect(manual.tabs).toHaveLength(1);
    expect(automatic.tags).toEqual(['recovery']);
    expect(automatic.automatic).toBe(true);
  });

  it('builds a duplicate-safe restoration plan', () => {
    const tabs = fixture().collections[0]!.tabs;
    expect(createRestorePlan(tabs, ['https://wxt.dev'], true)).toEqual({
      urls: ['https://developer.mozilla.org/extensions'],
      skippedDuplicates: 1,
      skippedRestricted: 0,
    });
    expect(createRestorePlan(tabs, ['https://wxt.dev'], false).urls).toHaveLength(2);
    expect(
      createRestorePlan(
        [
          ...tabs,
          {
            id: 'restricted',
            title: 'Settings',
            url: 'about:config',
            pinned: false,
            muted: false,
            order: 3,
          },
        ],
        [],
        true,
      ).skippedRestricted,
    ).toBe(1);
  });
});

describe('search and linked notes', () => {
  it('searches names, details, tags, and contained tabs', () => {
    const state = fixture();
    expect(searchLibrary(state, 'research')[0]?.kind).toBe('collection');
    expect(searchLibrary(state, 'mozilla').some((result) => result.kind === 'tab')).toBe(true);
    expect(searchLibrary(state, 'docs').some((result) => result.kind === 'link')).toBe(true);
    expect(searchLibrary(state, 'release').some((result) => result.kind === 'note')).toBe(true);
    expect(searchLibrary(state, 'research session')[0]?.score).toBe(100);
    expect(searchLibrary(state, 'research')[0]?.score).toBe(80);
    expect(searchLibrary(state, '   ')).toEqual([]);
  });

  it('extracts unique wiki links and finds backlinks', () => {
    expect(extractWikiLinks('[[One]] [[Two]] [[One]]')).toEqual(['One', 'Two']);
    expect(noteBacklinks(fixture(), 'Firefox')).toEqual(['note-1']);
  });
});

describe('ordering and recycle bin', () => {
  it('reorders entities without mutating invalid requests', () => {
    const items = fixture().notes;
    expect(reorderEntities(items, 'note-2', 'note-1').map((item) => item.id)).toEqual([
      'note-2',
      'note-1',
    ]);
    expect(reorderEntities(items, 'missing', 'note-1')).toBe(items);
  });

  it('trashes and restores every supported entity kind', () => {
    let state = fixture();
    state.folders = [
      {
        id: 'folder-1',
        workspaceId: state.workspaces[0]!.id,
        name: 'Folder',
        description: '',
        createdAt: 1,
        updatedAt: 1,
        order: 0,
      },
    ];
    const cases = [
      ['workspace', state.workspaces[0]!.id],
      ['folder', 'folder-1'],
      ['collection', 'collection-1'],
      ['link', 'link-1'],
      ['note', 'note-1'],
    ] as const;
    for (const [kind, id] of cases) {
      state = markTrashed(state, kind, id);
      state = restoreTrashed(state, kind, id);
    }
    expect(state.workspaces[0]!.trashedAt).toBeUndefined();
    expect(state.folders[0]!.trashedAt).toBeUndefined();
    expect(state.collections[0]!.trashedAt).toBeUndefined();
    expect(state.links[0]!.trashedAt).toBeUndefined();
    expect(state.notes[0]!.trashedAt).toBeUndefined();
  });

  it('permanently removes descendants of trashed containers', () => {
    const state = fixture();
    const trashed = markTrashed(state, 'workspace', state.workspaces[0]!.id);
    const purged = purgeTrash(trashed);
    expect(purged.workspaces).toEqual([]);
    expect(purged.collections).toEqual([]);
    expect(purged.links).toEqual([]);
    expect(purged.notes).toEqual([]);
  });
});

describe('versioned backups', () => {
  it('round-trips the complete library', () => {
    const state = fixture();
    expect(parseLibraryExport(serializeLibrary(state))).toEqual(state);
  });

  it('rejects invalid JSON and unrelated formats', () => {
    expect(() => parseLibraryExport('{')).toThrow('not valid JSON');
    expect(() => parseLibraryExport('{}')).toThrow('not a Tabitha Workspaces');
  });

  it('normalizes optional arrays and settings', () => {
    const state = fixture();
    const normalized = normalizeLibrary({
      ...state,
      revision: Number.NaN,
      settings: { ...state.settings, accent: '#fff' },
    });
    expect(normalized.revision).toBe(0);
    expect(normalized.settings.accent).toBe('#fff');
  });

  it('rejects unsupported and empty libraries', () => {
    const state = fixture();
    expect(() =>
      normalizeLibrary({ ...state, schemaVersion: 2 } as unknown as LibraryState),
    ).toThrow('unsupported');
    expect(() => normalizeLibrary({ ...state, workspaces: [] })).toThrow('at least one workspace');
  });
});
