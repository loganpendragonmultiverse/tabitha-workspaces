import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaults';
import { createCollectionFromTabs } from './library';
import {
  applyDuplicateMerge,
  normalizedReviewUrl,
  previewDuplicateMerge,
  reviewableCollections,
} from './duplicateReview';
import { parseLibraryExport } from './importExport';

describe('duplicate merge review', () => {
  const fixture = () => {
    const state = createDefaultState();
    const id = state.workspaces[0]!.id;
    state.collections = [
      createCollectionFromTabs(state, id, 'First', [
        { url: 'https://EXAMPLE.test:443/a#one', title: 'First title' },
        { url: 'https://example.test/a#two' },
      ]),
      createCollectionFromTabs(state, id, 'Second', [
        { url: 'https://example.test/a#one', title: 'Other title' },
        { url: 'https://other.test/' },
      ]),
    ];
    return state;
  };
  it('keeps query and fragment semantics unless explicitly changed', () => {
    expect(normalizedReviewUrl('https://EXAMPLE.test:443/a#one', 'normalized')).toBe(
      'https://example.test/a#one',
    );
    expect(normalizedReviewUrl('not a URL', 'normalized')).toBe('not a URL');
    const state = fixture(),
      ids = state.collections.map((c) => c.id);
    expect(previewDuplicateMerge(state, ids, 'exact').kept).toHaveLength(4);
    expect(previewDuplicateMerge(state, ids, 'normalized').kept).toHaveLength(3);
    expect(previewDuplicateMerge(state, ids, 'ignore-fragment').kept).toHaveLength(2);
  });
  it('creates a new copy with unique IDs and preserves originals', () => {
    const state = fixture(),
      before = structuredClone(state),
      preview = previewDuplicateMerge(
        state,
        state.collections.map((c) => c.id),
        'normalized',
      );
    const result = applyDuplicateMerge(state, preview, 'Merged');
    expect(result.collections).toHaveLength(3);
    expect(result.collections[0]!.tabs).toHaveLength(3);
    expect(result.collections[0]!.tabs[0]!.title).toBe('First title');
    expect(result.collections.slice(1)).toEqual(state.collections);
    expect(state).toEqual(before);
    expect(result.collections[0]!.tabs[0]!.id).not.toBe(state.collections[0]!.tabs[0]!.id);
    expect(() => applyDuplicateMerge(state, preview, ' ')).toThrow('Name');
    state.collections[0]!.tabs[0]!.title = 'Changed';
    expect(() => applyDuplicateMerge(state, preview, 'Merged')).toThrow('fresh preview');
  });
  it('excludes protected and trashed collections', () => {
    const state = fixture();
    state.collections[0]!.trashedAt = 1;
    expect(reviewableCollections(state)).toHaveLength(1);
    state.folders[0]!.protection = {
      version: 1,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: 310000,
      salt: 'x',
      vault: { iv: 'x', ciphertext: 'encrypted' },
    };
    expect(reviewableCollections(state)).toHaveLength(0);
    expect(() => previewDuplicateMerge(state, [state.collections[1]!.id], 'exact')).toThrow(
      'unprotected',
    );
  });
  it('rejects plaintext or ambiguous legacy protected imports', () => {
    const state = fixture();
    state.folders[0]!.protection = {
      version: 1,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: 310000,
      salt: 'x',
      vault: { iv: 'x', ciphertext: 'encrypted' },
    };
    const before = JSON.stringify(state);
    expect(() =>
      parseLibraryExport(
        JSON.stringify({ format: 'tabitha-workspaces', version: 3, library: state }),
      ),
    ).toThrow('plaintext');
    expect(JSON.stringify(state)).toBe(before);
    expect(() =>
      parseLibraryExport(
        JSON.stringify({
          format: 'tabitha-workspaces',
          version: 1,
          library: { ...state, schemaVersion: 1 },
        }),
      ),
    ).toThrow('Legacy protected');
  });
});
