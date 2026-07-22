import { storage } from 'wxt/utils/storage';
import { createDefaultState } from '../domain/defaults';
import { normalizeLibrary } from '../domain/library';
import type { LibraryState } from '../domain/types';

export const libraryItem = storage.defineItem<LibraryState>('local:library-v1', {
  version: 1,
  fallback: createDefaultState(),
});

export const getLibrary = async (): Promise<LibraryState> =>
  normalizeLibrary(await libraryItem.getValue());

export const setLibrary = async (state: LibraryState): Promise<LibraryState> => {
  const next = normalizeLibrary({
    ...state,
    revision: state.revision + 1,
    updatedAt: Date.now(),
  });
  await libraryItem.setValue(next);
  return next;
};

export const updateLibrary = async (
  update: (state: LibraryState) => LibraryState,
): Promise<LibraryState> => setLibrary(update(await getLibrary()));
