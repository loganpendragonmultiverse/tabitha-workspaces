import type { Workspace } from './types';

/** Keep the permanent home workspace first, followed by pinned and normal workspaces. */
export const sortWorkspaces = (workspaces: Workspace[], homeWorkspaceId: string): Workspace[] =>
  [...workspaces].sort((left, right) => {
    const home = Number(right.id === homeWorkspaceId) - Number(left.id === homeWorkspaceId);
    if (home) return home;
    const pinned = Number(Boolean(right.pinned)) - Number(Boolean(left.pinned));
    return pinned || left.order - right.order || right.createdAt - left.createdAt;
  });

/** Insert a new workspace at the front of its unpinned group without displacing Home or pins. */
export const insertWorkspaceNearTop = (
  workspaces: Workspace[],
  created: Workspace,
): Workspace[] => [
  ...workspaces.map((item) =>
    item.folderId === created.folderId && Boolean(item.pinned) === Boolean(created.pinned)
      ? { ...item, order: item.order + 1 }
      : item,
  ),
  { ...created, order: 0 },
];
