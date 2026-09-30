import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaults';
import { createCollectionFromTabs, normalizeLibrary } from './library';
import {
  formatPreferredDate,
  formatPreferredDateTime,
  formatSystemDateTime,
  isDateFormat,
} from './dateFormat';
import { applyDateNames, previewDateNames } from './datePreferences';
describe('date preference and reviewed name repair', () => {
  const stamp = new Date(2026, 8, 27, 16, 5).getTime();
  it('uses an explicit day/month order even when the browser is US English', () => {
    expect(formatPreferredDate(stamp, 'day-first', ['en-US'])).toBe('27/09/2026');
    expect(formatPreferredDateTime(stamp, 'day-first', ['en-US'])).toContain('27/09/2026');
    expect(formatPreferredDate(stamp, 'month-first', ['en-GB'])).toBe('9/27/2026');
    expect(formatPreferredDateTime(stamp, 'system', ['en-US'])).toContain('9/27/26');
    expect(formatPreferredDate(stamp, 'iso')).toBe('2026-09-27');
    expect(formatPreferredDateTime(stamp, 'iso')).toBe('2026-09-27 16:05');
    expect(isDateFormat('bad')).toBe(false);
    expect(isDateFormat('iso')).toBe(true);
  });
  it('normalizes old backups and invalid preferences without changing the schema', () => {
    const s = createDefaultState();
    s.settings.dateFormat = 'invalid' as never;
    expect(normalizeLibrary(s).settings.dateFormat).toBe('system');
    expect(normalizeLibrary(s).schemaVersion).toBe(3);
  });
  it('honors the preference for newly generated names and retains custom names', () => {
    const s = createDefaultState();
    s.settings.dateFormat = 'day-first';
    const c = createCollectionFromTabs(s, s.workspaces[0]!.id, '', []);
    expect(c.name).toBe('Collection ' + formatPreferredDateTime(c.createdAt, 'day-first'));
    expect(createCollectionFromTabs(s, s.workspaces[0]!.id, 'Custom name', []).name).toBe(
      'Custom name',
    );
  });
  it('previews only recognized names; repairs and undo preserve all saved content', () => {
    const s = createDefaultState();
    s.settings.dateFormat = 'day-first';
    const c = createCollectionFromTabs(s, s.workspaces[0]!.id, 'Research', []);
    c.createdAt = stamp;
    c.name = 'Collection ' + formatSystemDateTime(stamp, ['en-US']);
    s.collections = [c, { ...c, id: 'custom', name: 'My research 9/27/26' }];
    const changes = previewDateNames(s, 'day-first');
    expect(changes).toHaveLength(1);
    const repaired = applyDateNames(s, changes);
    expect(repaired.collections[0]?.name).toContain('27/09/2026');
    expect(s.collections[0]?.name).toContain('9/27/26');
    expect(applyDateNames(repaired, changes, true).collections[0]?.name).toBe(c.name);
    expect(repaired.collections[1]?.name).toBe('My research 9/27/26');
    const changed = { ...s, collections: s.collections.map((x) => ({ ...x, name: 'Edited' })) };
    expect(() => applyDateNames(changed, changes)).toThrow('changed');
    expect(() => applyDateNames(changed, changes, true)).toThrow('changed');
    s.folders[0]!.locked = true;
    expect(previewDateNames(s, 'day-first')).toEqual([]);
  });
});
