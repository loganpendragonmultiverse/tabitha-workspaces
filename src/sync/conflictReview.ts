import type { LibraryState } from '../domain/types';

export interface EntityDifferenceCounts {
  localOnly: number;
  remoteOnly: number;
  different: number;
  identical: number;
}
export interface SyncReview {
  remoteExists: boolean;
  equivalent: boolean;
  commonFingerprintKnown: boolean;
  baseSnapshotAvailable: false;
  categories: Record<
    'folders' | 'workspaces' | 'collections' | 'links' | 'notes',
    EntityDifferenceCounts
  >;
  settingsDiffer: boolean;
  protectedFoldersDiffer: number;
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
};
const equal = (a: unknown, b: unknown): boolean =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export const compareLibraryCopies = (
  local: LibraryState,
  remote: LibraryState | null,
  commonFingerprintKnown: boolean,
): SyncReview => {
  const counts = (left: { id: string }[], right: { id: string }[]): EntityDifferenceCounts => {
    const a = new Map(left.map((item) => [item.id, item]));
    const b = new Map(right.map((item) => [item.id, item]));
    return {
      localOnly: [...a.keys()].filter((id) => !b.has(id)).length,
      remoteOnly: [...b.keys()].filter((id) => !a.has(id)).length,
      different: [...a.keys()].filter((id) => b.has(id) && !equal(a.get(id), b.get(id))).length,
      identical: [...a.keys()].filter((id) => b.has(id) && equal(a.get(id), b.get(id))).length,
    };
  };
  const protectedLocal = local.folders.filter((folder) => folder.protection);
  const protectedRemote = remote?.folders.filter((folder) => folder.protection) ?? [];
  const protectedCounts = counts(protectedLocal, protectedRemote);
  return {
    remoteExists: remote !== null,
    equivalent: remote !== null && equal(local, remote),
    commonFingerprintKnown,
    baseSnapshotAvailable: false,
    categories: {
      folders: counts(local.folders, remote?.folders ?? []),
      workspaces: counts(local.workspaces, remote?.workspaces ?? []),
      collections: counts(local.collections, remote?.collections ?? []),
      links: counts(local.links, remote?.links ?? []),
      notes: counts(local.notes, remote?.notes ?? []),
    },
    settingsDiffer: remote !== null && !equal(local.settings, remote.settings),
    protectedFoldersDiffer:
      protectedCounts.localOnly + protectedCounts.remoteOnly + protectedCounts.different,
  };
};
