import { normalizeLibrary } from './library';
import type { LibraryExport, LibraryState } from './types';

export const exportLibrary = (library: LibraryState): LibraryExport => ({
  format: 'tabitha-workspaces',
  exportedAt: new Date().toISOString(),
  version: 1,
  library,
});

export const serializeLibrary = (library: LibraryState): string =>
  JSON.stringify(exportLibrary(library), null, 2);

export const parseLibraryExport = (input: string): LibraryState => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The backup is empty.');
  const envelope = parsed as Partial<LibraryExport>;
  if (envelope.format !== 'tabitha-workspaces' || envelope.version !== 1 || !envelope.library) {
    throw new Error('The selected file is not a Tabitha Workspaces version 1 backup.');
  }
  return normalizeLibrary(envelope.library);
};
