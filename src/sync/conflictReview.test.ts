import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../domain/defaults';
import { serializeLibrary } from '../domain/importExport';
import { compareLibraryCopies } from './conflictReview';
import { reviewWebDavCopies, reviewWebDavSnapshot } from './webdav';

const config = {
  enabled: true,
  url: 'https://private.example.test/SECRET-PATH',
  username: 'SECRET-USER',
  password: 'SECRET-PASSWORD',
};
afterEach(() => vi.unstubAllGlobals());

describe('read-only sync review', () => {
  it('counts two copies without exposing names, URLs, IDs or note text', () => {
    const local = createDefaultState();
    local.folders[0]!.name = 'PRIVATE-NAME';
    const remote = structuredClone(local);
    remote.folders[0]!.name = 'REMOTE-NAME';
    remote.workspaces[0]!.order = 4;
    local.notes.push({
      id: 'PRIVATE-ID',
      name: 'PRIVATE-NOTE',
      body: 'PRIVATE-BODY',
      tags: [],
      workspaceId: local.workspaces[0]!.id,
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    remote.links.push({
      id: 'REMOTE-ID',
      name: 'PRIVATE-LINK',
      url: 'https://secret.example.test/token',
      description: '',
      tags: [],
      workspaceId: remote.workspaces[0]!.id,
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    remote.settings.theme = 'dark';
    const before = structuredClone([local, remote]);
    const review = compareLibraryCopies(local, remote, true);
    expect(review.categories.folders.different).toBe(1);
    expect(review.categories.workspaces.different).toBe(1);
    expect(review.categories.notes.localOnly).toBe(1);
    expect(review.categories.links.remoteOnly).toBe(1);
    expect(review.settingsDiffer).toBe(true);
    expect(review.baseSnapshotAvailable).toBe(false);
    expect(JSON.stringify(review)).not.toMatch(/PRIVATE|REMOTE-ID|secret.example|token/);
    expect([local, remote]).toEqual(before);
  });

  it('compares stable entity fields and keeps encrypted vaults opaque', () => {
    const local = createDefaultState();
    const remote = structuredClone(local);
    remote.folders[0] = Object.fromEntries(
      Object.entries(remote.folders[0]!).reverse(),
    ) as unknown as (typeof remote.folders)[0];
    expect(compareLibraryCopies(local, remote, false).equivalent).toBe(true);
    expect(compareLibraryCopies(local, remote, false).categories.folders.identical).toBe(1);
    local.folders[0]!.protection = {
      version: 1,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: 100000,
      salt: 'PRIVATE-SALT',
      vault: { iv: 'PRIVATE-IV', ciphertext: 'PRIVATE-CIPHERTEXT' },
    };
    const review = compareLibraryCopies(local, remote, true);
    expect(review.protectedFoldersDiffer).toBe(1);
    expect(JSON.stringify(review)).not.toContain('PRIVATE');
  });

  it('performs exactly one GET and no upload or restore', async () => {
    const local = createDefaultState();
    const remote = structuredClone(local);
    remote.workspaces[0]!.name = 'Different';
    const initial = structuredClone(local);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(serializeLibrary(remote), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const report = await reviewWebDavCopies(config, local);
    expect(report.categories.workspaces.different).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('GET');
    expect((fetchMock.mock.calls[0]![1] as RequestInit).body).toBeUndefined();
    expect(local).toEqual(initial);
    expect(JSON.stringify(report)).not.toMatch(/SECRET|private.example/);
  });

  it('reports missing remote content without creating a backup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const report = await reviewWebDavCopies(config, createDefaultState());
    expect(report.remoteExists).toBe(false);
    expect(report.equivalent).toBe(false);
    expect(report.categories.folders.localOnly).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses malformed remote data and network failures without writes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('truncated', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(reviewWebDavCopies(config, createDefaultState())).rejects.toThrow();
    await expect(reviewWebDavCopies(config, createDefaultState())).rejects.toThrow();
    expect(fetchMock.mock.calls.every((call) => (call[1] as RequestInit).method === 'GET')).toBe(
      true,
    );
  });

  it('refuses a review if local data changed during transfer', async () => {
    const local = createDefaultState();
    const changed = structuredClone(local);
    changed.workspaces[0]!.name = 'Concurrent local edit';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(serializeLibrary(local), { status: 200 })),
    );
    const read = vi.fn().mockResolvedValueOnce(local).mockResolvedValueOnce(changed);
    await expect(reviewWebDavSnapshot(config, read)).rejects.toThrow('local library changed');
    expect(read).toHaveBeenCalledTimes(2);
  });
});
