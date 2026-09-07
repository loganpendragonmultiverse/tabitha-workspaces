import { expect, it } from 'vitest';
import { syncDiagnostics } from './diagnostics';
it('exports useful status without private configuration or raw errors', () => {
  const config = {
    enabled: true,
    url: 'https://PRIVATE-HOST/',
    username: 'PRIVATE-USER',
    hasPassword: true,
    lastSyncedAt: 1,
    lastError: 'Sync conflict PRIVATE-CONTENT',
  };
  const report = syncDiagnostics(config, 200 * 3_600_000);
  expect(report.errorCategory).toBe('conflict');
  expect(JSON.stringify(report)).not.toContain('PRIVATE-');
  const { lastError: _lastError, ...successful } = config;
  const { lastSyncedAt: _lastSyncedAt, ...neverSynced } = successful;
  expect(_lastError).toContain('Sync conflict');
  expect(_lastSyncedAt).toBe(1);
  expect(syncDiagnostics(successful, 200 * 3_600_000).status).toBe('stale-over-seven-days');
  expect(syncDiagnostics(neverSynced).status).toBe('never-synced');
  expect(syncDiagnostics({ ...config, enabled: false }).status).toBe('disabled');
  expect(syncDiagnostics({ ...config, lastError: '401' }).errorCategory).toBe('authentication');
  expect(syncDiagnostics({ ...config, lastError: 'Failed to fetch' }).errorCategory).toBe(
    'connection',
  );
});
