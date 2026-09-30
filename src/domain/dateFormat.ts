import type { DateFormat } from './types';
const preferredLocales = (): string[] | undefined =>
  typeof navigator !== 'undefined' && navigator.languages?.length
    ? [...navigator.languages]
    : undefined;

export const formatSystemDate = (timestamp: number, locales = preferredLocales()): string =>
  new Intl.DateTimeFormat(locales).format(new Date(timestamp));

export const formatSystemDateTime = (timestamp: number, locales = preferredLocales()): string =>
  new Intl.DateTimeFormat(locales, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));

export const isDateFormat = (value: unknown): value is DateFormat =>
  ['system', 'day-first', 'month-first', 'iso'].includes(String(value));
const dateLocale = (format: DateFormat, locales?: string[]): string[] | undefined =>
  format === 'day-first' ? ['en-GB'] : format === 'month-first' ? ['en-US'] : locales;
export const formatPreferredDate = (
  timestamp: number,
  format: DateFormat = 'system',
  locales = preferredLocales(),
): string => {
  if (format !== 'iso') return formatSystemDate(timestamp, dateLocale(format, locales));
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};
export const formatPreferredDateTime = (
  timestamp: number,
  format: DateFormat = 'system',
  locales = preferredLocales(),
): string => {
  if (format !== 'iso') return formatSystemDateTime(timestamp, dateLocale(format, locales));
  const date = new Date(timestamp);
  return (
    formatPreferredDate(timestamp, format) +
    ' ' +
    String(date.getHours()).padStart(2, '0') +
    ':' +
    String(date.getMinutes()).padStart(2, '0')
  );
};
