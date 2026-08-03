import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../domain/defaults';
import { serializeLibrary } from '../domain/importExport';
import type { LibraryState } from '../domain/types';
import type { CloudSyncConfig } from '../storage/cloudSyncStore';
import { libraryFingerprint, synchronizeWebDav } from './webdav';

const config: CloudSyncConfig = {
  enabled: true,
  url: 'https://cloud.example.test/tabitha.json',
  username: 'tabitha',
  password: 'app password',
};

const responseFor = (library: LibraryState, etag = '"remote-1"'): Response =>
  new Response(serializeLibrary(library), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ETag: etag },
  });

afterEach(() => vi.unstubAllGlobals());

describe('WebDAV synchronization', () => {
  it('creates a missing backup with a non-overwrite precondition', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 204, headers: { ETag: '"new"' } }));
    vi.stubGlobal('fetch', fetchMock);
    const library = createDefaultState();

    await expect(synchronizeWebDav(config, library, 'upload')).resolves.toMatchObject({
      action: 'uploaded',
      library,
      etag: '"new"',
    });
    const [, request] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(request.method).toBe('PUT');
    expect(new Headers(request.headers).get('Authorization')).toMatch(/^Basic /);
    expect(new Headers(request.headers).get('If-None-Match')).toBe('*');
  });

  it('downloads and validates a remote Tabitha library', async () => {
    const remote = { ...createDefaultState(), updatedAt: 500 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(remote)));

    const result = await synchronizeWebDav(config, createDefaultState(), 'download');
    expect(result.action).toBe('downloaded');
    expect(result.library.updatedAt).toBe(500);
    expect(result.fingerprint).toBe(await libraryFingerprint(remote));
  });

  it('downloads remote-only changes after a known common version', async () => {
    const base = { ...createDefaultState(), updatedAt: 100 };
    const remote = { ...base, updatedAt: 200, revision: 1 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(remote)));

    await expect(
      synchronizeWebDav(
        { ...config, lastSyncedFingerprint: await libraryFingerprint(base) },
        base,
        'auto',
      ),
    ).resolves.toMatchObject({ action: 'downloaded', library: { updatedAt: 200 } });
  });

  it('uploads local-only changes with the remote ETag', async () => {
    const base = { ...createDefaultState(), updatedAt: 100 };
    const local = { ...base, updatedAt: 200, revision: 1 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(responseFor(base, '"base"'))
      .mockResolvedValueOnce(new Response(null, { status: 204, headers: { ETag: '"next"' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      synchronizeWebDav(
        { ...config, lastSyncedFingerprint: await libraryFingerprint(base) },
        local,
        'auto',
      ),
    ).resolves.toMatchObject({ action: 'uploaded', etag: '"next"' });
    const [, request] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(new Headers(request.headers).get('If-Match')).toBe('"base"');
  });

  it('stops when both copies changed instead of choosing by timestamp', async () => {
    const base = { ...createDefaultState(), updatedAt: 100 };
    const local = { ...base, updatedAt: 300, revision: 1 };
    const remote = {
      ...base,
      updatedAt: 200,
      revision: 1,
      settings: { ...base.settings, density: 'compact' as const },
    };
    const fetchMock = vi.fn().mockResolvedValue(responseFor(remote));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      synchronizeWebDav(
        { ...config, lastSyncedFingerprint: await libraryFingerprint(base) },
        local,
        'auto',
      ),
    ).rejects.toThrow('Sync conflict');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not let an unrecognized old browser overwrite an existing remote copy', async () => {
    const local = { ...createDefaultState(), updatedAt: 500, revision: 4 };
    const remote = { ...createDefaultState(), updatedAt: 100, revision: 2 };
    const fetchMock = vi.fn().mockResolvedValue(responseFor(remote));
    vi.stubGlobal('fetch', fetchMock);

    await expect(synchronizeWebDav(config, local, 'auto')).rejects.toThrow('Sync conflict');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('detects a server race through a failed conditional upload', async () => {
    const base = createDefaultState();
    const local = { ...base, revision: 1 };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(responseFor(base, '"base"'))
        .mockResolvedValueOnce(new Response('', { status: 412 })),
    );

    await expect(
      synchronizeWebDav(
        { ...config, lastSyncedFingerprint: await libraryFingerprint(base) },
        local,
        'upload',
      ),
    ).rejects.toThrow('Sync conflict');
  });

  it('refuses to replace a remote file without a server validator', async () => {
    const base = createDefaultState();
    const local = { ...base, revision: 1 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(serializeLibrary(base), { status: 200 })),
    );

    await expect(
      synchronizeWebDav(
        { ...config, lastSyncedFingerprint: await libraryFingerprint(base) },
        local,
        'upload',
      ),
    ).rejects.toThrow('Safe upload is unavailable');
  });

  it('rejects insecure endpoints and a missing remote backup', async () => {
    await expect(
      synchronizeWebDav(
        { ...config, url: 'http://cloud.example.test/file' },
        createDefaultState(),
        'upload',
      ),
    ).rejects.toThrow('HTTPS');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(synchronizeWebDav(config, createDefaultState(), 'download')).rejects.toThrow(
      'No Tabitha backup',
    );
  });
});
