import { describe, expect, it } from 'vitest';
import { resolveDashboardView } from './navigation';

describe('dashboard navigation', () => {
  it.each(['#/sessions', '#/live'])('routes the legacy %s view to open windows', (hash) => {
    expect(resolveDashboardView(hash)).toBe('windows');
  });

  it.each([
    ['#/overview', 'overview'],
    ['#/windows', 'windows'],
    ['#/links', 'links'],
    ['#/notes', 'notes'],
    ['#/trash', 'trash'],
    ['#/settings', 'settings'],
  ] as const)('resolves %s to %s', (hash, view) => {
    expect(resolveDashboardView(hash)).toBe(view);
  });

  it.each(['', '#/', '#/unknown', '#/sessions/old-id'])('falls back safely for %s', (hash) => {
    expect(resolveDashboardView(hash)).toBe(
      hash.startsWith('#/sessions/') ? 'windows' : 'overview',
    );
  });
});
