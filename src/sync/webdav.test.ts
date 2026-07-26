import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../domain/defaults';
import { serializeLibrary } from '../domain/importExport';
import type { CloudSyncConfig } from '../storage/cloudSyncStore';
import { synchronizeWebDav } from './webdav';

const config: CloudSyncConfig = {
  enabled: true,
  url: 'https://cloud.example.test/tabitha.json',
  username: 'tabitha',
  password: 'app password',
};

afterEach(() => vi.unstubAllGlobals());

describe('WebDAV synchronization', () => {
  it('uploads a library with basic authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const library = createDefaultState();

    await expect(synchronizeWebDav(config, library, 'upload')).resolves.toMatchObject({
      action: 'uploaded',
      library,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(request.method).toBe('PUT');
    expect(new Headers(request.headers).get('Authorization')).toMatch(/^Basic /);
  });

  it('downloads and validates a remote Tabitha library', async () => {
    const remote = { ...createDefaultState(), updatedAt: 500 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(serializeLibrary(remote), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await synchronizeWebDav(config, createDefaultState(), 'download');
    expect(result.action).toBe('downloaded');
    expect(result.library.updatedAt).toBe(500);
  });

  it('uses the newest library during automatic sync', async () => {
    const local = { ...createDefaultState(), updatedAt: 100 };
    const remote = { ...createDefaultState(), updatedAt: 200 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(serializeLibrary(remote), { status: 200 })),
    );

    await expect(synchronizeWebDav(config, local, 'auto')).resolves.toMatchObject({
      action: 'downloaded',
      library: { updatedAt: 200 },
    });
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
