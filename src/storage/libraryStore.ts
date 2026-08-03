import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { createDefaultState } from '../domain/defaults';
import { normalizeLibrary } from '../domain/library';
import type { Folder, LibraryState } from '../domain/types';
import {
  createProtection,
  decryptFolderVault,
  deriveFolderKey,
  encryptFolderVault,
  exportFolderKey,
  folderVaultFromLibrary,
  importFolderKey,
  randomSalt,
  withoutFolderContents,
} from '../security/folderVault';

const SESSION_KEYS = 'tabitha-folder-keys-v1';

export const libraryItem = storage.defineItem<LibraryState>('local:library-v1', {
  version: 1,
  fallback: createDefaultState(),
});

const getSessionKeys = async (): Promise<Record<string, string>> => {
  const stored = await browser.storage.session.get(SESSION_KEYS);
  const value = stored[SESSION_KEYS];
  return value && typeof value === 'object' ? (value as Record<string, string>) : {};
};

const setSessionKey = async (folderId: string, value?: string): Promise<void> => {
  const keys = await getSessionKeys();
  if (value) keys[folderId] = value;
  else delete keys[folderId];
  await browser.storage.session.set({ [SESSION_KEYS]: keys });
};

const runtimeFolder = (folder: Folder, locked: boolean): Folder => ({ ...folder, locked });
const storedFolder = (folder: Folder): Folder => {
  const next = { ...folder };
  delete next.locked;
  return next;
};

const hydrateLibrary = async (stored: LibraryState): Promise<LibraryState> => {
  let runtime = normalizeLibrary(stored);
  const keys = await getSessionKeys();
  for (const folder of runtime.folders) {
    if (!folder.protection) continue;
    const encodedKey = keys[folder.id];
    if (!encodedKey) {
      runtime = {
        ...withoutFolderContents(runtime, folder.id),
        folders: runtime.folders.map((item) =>
          item.id === folder.id ? runtimeFolder(item, true) : item,
        ),
      };
      continue;
    }
    try {
      const vault = await decryptFolderVault(
        await importFolderKey(encodedKey),
        folder.protection.vault,
      );
      if (vault.folderId !== folder.id) throw new Error('Folder identity mismatch.');
      runtime = {
        ...withoutFolderContents(runtime, folder.id),
        folders: runtime.folders.map((item) =>
          item.id === folder.id ? runtimeFolder(item, false) : item,
        ),
        workspaces: [...runtime.workspaces, ...vault.workspaces],
        collections: [...runtime.collections, ...vault.collections],
        links: [...runtime.links, ...vault.links],
        notes: [...runtime.notes, ...vault.notes],
      };
    } catch {
      await setSessionKey(folder.id);
      runtime = {
        ...withoutFolderContents(runtime, folder.id),
        folders: runtime.folders.map((item) =>
          item.id === folder.id ? runtimeFolder(item, true) : item,
        ),
      };
    }
  }
  return runtime;
};

const sealLibrary = async (runtime: LibraryState): Promise<LibraryState> => {
  let stored = normalizeLibrary(runtime);
  const keys = await getSessionKeys();
  for (const folder of stored.folders) {
    if (!folder.protection) continue;
    const encodedKey = keys[folder.id];
    if (encodedKey && !folder.locked) {
      const vault = folderVaultFromLibrary(stored, folder.id);
      const protection = {
        ...folder.protection,
        vault: await encryptFolderVault(await importFolderKey(encodedKey), vault),
      };
      stored = {
        ...withoutFolderContents(stored, folder.id),
        folders: stored.folders.map((item) =>
          item.id === folder.id ? storedFolder({ ...item, protection }) : item,
        ),
      };
    } else {
      stored = {
        ...withoutFolderContents(stored, folder.id),
        folders: stored.folders.map((item) => (item.id === folder.id ? storedFolder(item) : item)),
      };
    }
  }
  return { ...stored, folders: stored.folders.map(storedFolder) };
};

export const getStoredLibrary = async (): Promise<LibraryState> =>
  normalizeLibrary(await libraryItem.getValue());

export const getLibrary = async (): Promise<LibraryState> =>
  hydrateLibrary(await getStoredLibrary());

export const setLibrary = async (state: LibraryState): Promise<LibraryState> => {
  const next = normalizeLibrary({
    ...state,
    revision: state.revision + 1,
    updatedAt: Date.now(),
  });
  const stored = await sealLibrary(next);
  await libraryItem.setValue(stored);
  return hydrateLibrary(stored);
};

export const replaceStoredLibrary = async (state: LibraryState): Promise<LibraryState> => {
  await libraryItem.setValue(normalizeLibrary(state));
  return getLibrary();
};

export const protectFolder = async (
  state: LibraryState,
  folderId: string,
  password: string,
): Promise<LibraryState> => {
  if (password.length < 10) throw new Error('Use a password with at least 10 characters.');
  const folder = state.folders.find((item) => item.id === folderId);
  if (!folder || folder.protection) throw new Error('That folder cannot be protected.');
  const salt = randomSalt();
  const key = await deriveFolderKey(password, salt);
  await setSessionKey(folderId, await exportFolderKey(key));
  return setLibrary({
    ...state,
    folders: state.folders.map((item) =>
      item.id === folderId ? { ...item, protection: createProtection(salt), locked: false } : item,
    ),
  });
};

export const unlockFolder = async (folder: Folder, password: string): Promise<LibraryState> => {
  if (!folder.protection) throw new Error('That folder is not protected.');
  try {
    const key = await deriveFolderKey(
      password,
      folder.protection.salt,
      folder.protection.iterations,
    );
    const vault = await decryptFolderVault(key, folder.protection.vault);
    if (vault.folderId !== folder.id) throw new Error('Folder identity mismatch.');
    await setSessionKey(folder.id, await exportFolderKey(key));
    return getLibrary();
  } catch {
    throw new Error('The password is incorrect or the protected folder is damaged.');
  }
};

export const lockFolder = async (folderId: string): Promise<LibraryState> => {
  await setSessionKey(folderId);
  return getLibrary();
};

export const removeFolderProtection = async (
  state: LibraryState,
  folderId: string,
): Promise<LibraryState> => {
  const folder = state.folders.find((item) => item.id === folderId);
  if (!folder?.protection || folder.locked) throw new Error('Unlock the folder first.');
  const next = {
    ...state,
    folders: state.folders.map((item) => {
      if (item.id !== folderId) return item;
      const unprotected = { ...item };
      delete unprotected.protection;
      delete unprotected.locked;
      return unprotected;
    }),
  };
  await setSessionKey(folderId);
  return setLibrary(next);
};

export const updateLibrary = async (
  update: (state: LibraryState) => LibraryState,
): Promise<LibraryState> => setLibrary(update(await getLibrary()));
