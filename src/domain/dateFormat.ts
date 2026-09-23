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
