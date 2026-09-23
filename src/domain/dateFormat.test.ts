import { describe, expect, it } from 'vitest';
import { formatSystemDate, formatSystemDateTime } from './dateFormat';

describe('system date formatting', () => {
  const timestamp = new Date(2026, 7, 27, 16, 5).getTime();
  it('uses the supplied/system locale instead of a hard-coded date order', () => {
    expect(formatSystemDate(timestamp, ['en-GB'])).toBe('27/08/2026');
    expect(formatSystemDate(timestamp, ['en-US'])).toBe('8/27/2026');
  });
  it('uses the same locale policy for generated date/time labels', () => {
    expect(formatSystemDateTime(timestamp, ['en-GB'])).toContain('27/08/2026');
    expect(formatSystemDateTime(timestamp, ['en-US'])).toContain('8/27/26');
  });
});
