import type { CloudSyncPublicConfig } from '../browser/messages';
export const syncDiagnostics = (config: CloudSyncPublicConfig, now = Date.now()) => {
  const ageHours =
    config.lastSyncedAt === undefined
      ? null
      : Math.max(0, Math.floor((now - config.lastSyncedAt) / 3_600_000));
  const error = config.lastError?.toLowerCase() ?? '';
  const category = !error
    ? 'none'
    : error.includes('conflict')
      ? 'conflict'
      : /401|403/.test(error)
        ? 'authentication'
        : /network|fetch|timeout|abort/.test(error)
          ? 'connection'
          : 'other';
  return {
    schemaVersion: 1,
    enabled: config.enabled,
    credentialsConfigured: config.hasPassword,
    lastSuccessAgeHours: ageHours,
    status: !config.enabled
      ? 'disabled'
      : category !== 'none'
        ? 'needs-attention'
        : ageHours === null
          ? 'never-synced'
          : ageHours > 168
            ? 'stale-over-seven-days'
            : 'recent-success',
    errorCategory: category,
    guidance:
      category === 'conflict'
        ? 'Export a local backup, inspect the remote version, then choose explicitly.'
        : category === 'authentication'
          ? 'Check WebDAV credentials and server permissions.'
          : category === 'connection'
            ? 'Check connectivity and retry; an interrupted request is not proof of remote failure.'
            : 'Review the last successful sync and run a manual check when needed.',
    boundary: 'No endpoint, username, password, browsing content or raw server error is included.',
  };
};
