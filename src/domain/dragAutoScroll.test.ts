import { describe, expect, it } from 'vitest';
import { dragAutoScrollDelta } from './dragAutoScroll';

describe('drag edge auto-scroll', () => {
  it('scrolls upward and downward only inside the edge zones', () => {
    expect(dragAutoScrollDelta(0, 800)).toBe(-28);
    expect(dragAutoScrollDelta(48, 800)).toBe(-14);
    expect(dragAutoScrollDelta(400, 800)).toBe(0);
    expect(dragAutoScrollDelta(752, 800)).toBe(14);
    expect(dragAutoScrollDelta(800, 800)).toBe(28);
  });

  it('clamps pointers outside the viewport and ignores invalid viewports', () => {
    expect(dragAutoScrollDelta(-50, 800)).toBe(-28);
    expect(dragAutoScrollDelta(900, 800)).toBe(28);
    expect(dragAutoScrollDelta(10, 0)).toBe(0);
  });
});
