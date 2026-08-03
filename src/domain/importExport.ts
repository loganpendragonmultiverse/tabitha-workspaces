import { normalizeLibrary } from './library';
import type { Folder, FolderExport, LibraryExport, LibraryState } from './types';

export const exportLibrary = (library: LibraryState): LibraryExport => ({
  format: 'tabitha-workspaces',
  exportedAt: new Date().toISOString(),
  version: 3,
  library,
});

export const serializeLibrary = (library: LibraryState): string =>
  JSON.stringify(exportLibrary(library), null, 2);

const withoutRuntimeState = (folder: Folder): Folder => {
  const stored = { ...folder };
  delete stored.locked;
  return stored;
};

export const exportFolder = (library: LibraryState, folderId: string): FolderExport => {
  const folder = library.folders.find((item) => item.id === folderId);
  if (!folder) throw new Error('That folder no longer exists.');
  const workspaces = library.workspaces.filter((item) => item.folderId === folderId);
  const workspaceIds = new Set(workspaces.map((item) => item.id));
  const backup: FolderExport = {
    format: 'tabitha-workspaces-folder',
    exportedAt: new Date().toISOString(),
    version: 1,
    folder: withoutRuntimeState(folder),
    workspaces,
    collections: library.collections.filter((item) => workspaceIds.has(item.workspaceId)),
    links: library.links.filter((item) => workspaceIds.has(item.workspaceId)),
    notes: library.notes.filter((item) => workspaceIds.has(item.workspaceId)),
  };
  if (
    folder.protection &&
    [backup.workspaces, backup.collections, backup.links, backup.notes].some(
      (items) => items.length > 0,
    )
  ) {
    throw new Error('Protected folder contents must be sealed before export.');
  }
  return backup;
};

export const serializeFolder = (library: LibraryState, folderId: string): string =>
  JSON.stringify(exportFolder(library, folderId), null, 2);

export const parseLibraryExport = (input: string): LibraryState => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The backup is empty.');
  const envelope = parsed as Partial<LibraryExport>;
  if (
    envelope.format !== 'tabitha-workspaces' ||
    ![1, 2, 3].includes(Number(envelope.version)) ||
    !envelope.library
  ) {
    throw new Error('The selected file is not a supported Tabitha Workspaces backup.');
  }
  return normalizeLibrary(envelope.library);
};

export const parseFolderExport = (input: string): FolderExport => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The backup is empty.');
  const backup = parsed as Partial<FolderExport>;
  if (
    backup.format !== 'tabitha-workspaces-folder' ||
    backup.version !== 1 ||
    !backup.folder ||
    !Array.isArray(backup.workspaces) ||
    !Array.isArray(backup.collections) ||
    !Array.isArray(backup.links) ||
    !Array.isArray(backup.notes)
  ) {
    throw new Error('The selected file is not a supported Tabitha folder backup.');
  }
  const folder = withoutRuntimeState(backup.folder);
  const workspaceIds = new Set(backup.workspaces.map((item) => item.id));
  if (backup.workspaces.some((item) => item.folderId !== folder.id)) {
    throw new Error('The folder backup contains a workspace assigned to another folder.');
  }
  if (
    [...backup.collections, ...backup.links, ...backup.notes].some(
      (item) => !workspaceIds.has(item.workspaceId),
    )
  ) {
    throw new Error('The folder backup contains content assigned to an unknown workspace.');
  }
  if (
    folder.protection &&
    [backup.workspaces, backup.collections, backup.links, backup.notes].some(
      (items) => items.length > 0,
    )
  ) {
    throw new Error('A protected folder backup cannot contain plaintext folder contents.');
  }
  return { ...backup, folder } as FolderExport;
};

export const mergeFolderExport = (library: LibraryState, backup: FolderExport): LibraryState => {
  const existingWorkspaceIds = new Set(
    library.workspaces.filter((item) => item.folderId === backup.folder.id).map((item) => item.id),
  );
  const remainingWorkspaces = library.workspaces.filter(
    (item) => item.folderId !== backup.folder.id,
  );
  const remainingCollections = library.collections.filter(
    (item) => !existingWorkspaceIds.has(item.workspaceId),
  );
  const remainingLinks = library.links.filter(
    (item) => !existingWorkspaceIds.has(item.workspaceId),
  );
  const remainingNotes = library.notes.filter(
    (item) => !existingWorkspaceIds.has(item.workspaceId),
  );
  const assertUnique = (label: string, current: { id: string }[], incoming: { id: string }[]) => {
    const ids = new Set(current.map((item) => item.id));
    if (incoming.some((item) => ids.has(item.id))) {
      throw new Error(`The folder backup conflicts with an existing ${label} identifier.`);
    }
  };
  assertUnique('workspace', remainingWorkspaces, backup.workspaces);
  assertUnique('collection', remainingCollections, backup.collections);
  assertUnique('link', remainingLinks, backup.links);
  assertUnique('note', remainingNotes, backup.notes);
  return normalizeLibrary({
    ...library,
    folders: [...library.folders.filter((item) => item.id !== backup.folder.id), backup.folder],
    workspaces: [...remainingWorkspaces, ...backup.workspaces],
    collections: [...remainingCollections, ...backup.collections],
    links: [...remainingLinks, ...backup.links],
    notes: [...remainingNotes, ...backup.notes],
  });
};
