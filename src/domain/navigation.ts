export type DashboardView = 'overview' | 'windows' | 'links' | 'notes' | 'trash' | 'settings';

const DASHBOARD_VIEWS = new Set<DashboardView>([
  'overview',
  'windows',
  'links',
  'notes',
  'trash',
  'settings',
]);

/** Resolve dashboard hashes while preserving bookmarks from the pre-1.6 information architecture. */
export const resolveDashboardView = (hash: string): DashboardView => {
  const route = hash.replace(/^#?\/?/, '').split(/[/?]/, 1)[0];
  if (route === 'sessions' || route === 'live') return 'windows';
  return DASHBOARD_VIEWS.has(route as DashboardView) ? (route as DashboardView) : 'overview';
};
