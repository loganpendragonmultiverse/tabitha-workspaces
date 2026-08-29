import { describe, expect, it } from 'vitest';
import { captureTabQuery, collectionSortAfterCapture } from './capture';

describe('window capture targeting', () => {
  it('uses the current window when no explicit browser window is selected', () => {
    expect(captureTabQuery()).toEqual({ currentWindow: true });
  });

  it('preserves an explicitly selected other browser window', () => {
    expect(captureTabQuery(42)).toEqual({ windowId: 42 });
  });

  it('shows manual captures first without changing the view for automatic snapshots', () => {
    const current = { home: 'alphabetical' as const };
    expect(collectionSortAfterCapture(current, 'home', false)).toEqual({ home: 'custom' });
    expect(collectionSortAfterCapture(current, 'home', true)).toBe(current);
  });
});
