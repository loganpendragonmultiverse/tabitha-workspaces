import { describe, expect, it } from 'vitest';
import { createWorkspace } from './defaults';
import { insertWorkspaceNearTop, sortWorkspaces } from './workspaceOrder';

describe('workspace ordering', () => {
  it('keeps Home first, then pinned workspaces, then custom order', () => {
    const home = { ...createWorkspace('Home', '', 'folder'), id: 'home', order: 9 };
    const pinned = {
      ...createWorkspace('Pinned', '', 'folder'),
      id: 'pinned',
      order: 5,
      pinned: true,
    };
    const normal = { ...createWorkspace('Normal', '', 'folder'), id: 'normal', order: 0 };
    expect(sortWorkspaces([normal, pinned, home], home.id).map((item) => item.id)).toEqual([
      'home',
      'pinned',
      'normal',
    ]);
  });

  it('places a new workspace first within the normal group', () => {
    const old = { ...createWorkspace('Old', '', 'folder'), id: 'old', order: 0 };
    const created = { ...createWorkspace('New', '', 'folder'), id: 'new', order: 20 };
    const next = insertWorkspaceNearTop([old], created);
    expect(sortWorkspaces(next, '').map((item) => item.id)).toEqual(['new', 'old']);
  });
});
