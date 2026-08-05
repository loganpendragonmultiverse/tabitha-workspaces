import type { Collection, SessionLayout, Settings } from './types';

/** Select a layout and reveal that workspace's collections so the change is immediately visible. */
export const applyWorkspaceLayout = (
  settings: Settings,
  collections: Collection[],
  workspaceId: string,
  sessionLayout: SessionLayout,
): Settings => {
  const workspaceCollectionIds = new Set(
    collections
      .filter((collection) => collection.workspaceId === workspaceId)
      .map((collection) => collection.id),
  );
  return {
    ...settings,
    sessionLayout,
    collapsedCollectionIds: settings.collapsedCollectionIds.filter(
      (id) => !workspaceCollectionIds.has(id),
    ),
  };
};
