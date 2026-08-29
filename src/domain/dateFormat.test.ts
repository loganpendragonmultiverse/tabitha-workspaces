import { describe, expect, it } from 'vitest';
import { formatUkDate } from './dateFormat';

describe('UK date formatting', () => {
  it('renders saved dates day-first', () => {
    expect(formatUkDate(new Date(2026, 7, 27, 12).getTime())).toBe('27/08/2026');
  });
});
