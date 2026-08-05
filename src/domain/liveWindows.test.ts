import { describe, expect, it } from 'vitest';
import { groupLiveTabs, setCollapsedWindowKeys } from './liveWindows';

describe('live browser windows', () => {
  it('groups tabs by browser window while preserving their order', () => {
    const tabs: { id: number; windowId?: number }[] = [
      { id: 1, windowId: 9 },
      { id: 2, windowId: 4 },
      { id: 3, windowId: 9 },
    ];
    const grouped = groupLiveTabs(tabs);

    expect(grouped.map((group) => group.key)).toEqual(['window-9', 'window-4']);
    expect(grouped[0]?.tabs.map((tab) => tab.id)).toEqual([1, 3]);
  });

  it('uses one stable group when a browser omits the window ID', () => {
    const tabs: { id: number; windowId?: number }[] = [{ id: 1 }, { id: 2 }];
    const grouped = groupLiveTabs(tabs);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.key).toBe('window-unknown');
  });

  it('collapses and expands visible windows without discarding unrelated keys', () => {
    const windows = groupLiveTabs([{ windowId: 1 }, { windowId: 2 }]);
    const collapsed = setCollapsedWindowKeys(['window-99'], windows, true);
    expect(new Set(collapsed)).toEqual(new Set(['window-99', 'window-1', 'window-2']));
    expect(setCollapsedWindowKeys(collapsed, windows, false)).toEqual(['window-99']);
  });
});
