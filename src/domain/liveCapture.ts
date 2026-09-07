import type { LiveTab } from '../browser/messages';
import { createId } from './defaults';
import { isRestorableUrl } from './library';
import type { Collection } from './types';

export const appendLiveTabs = (
  collection: Collection,
  tabs: LiveTab[],
  skipDuplicates: boolean,
): Collection => {
  const urls = new Set(collection.tabs.map((tab) => tab.url));
  const added = [];
  for (const tab of tabs) {
    if (!isRestorableUrl(tab.url) || (skipDuplicates && urls.has(tab.url))) continue;
    urls.add(tab.url);
    added.push({
      id: createId(),
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned,
      muted: false,
      order: collection.tabs.length + added.length,
      ...(tab.favIconUrl ? { faviconUrl: tab.favIconUrl } : {}),
    });
  }
  return added.length
    ? { ...collection, tabs: [...collection.tabs, ...added], updatedAt: Date.now() }
    : collection;
};

export const filterLiveTabs = (tabs: LiveTab[], query: string): (LiveTab & { id: number })[] => {
  const needle = query.trim().toLowerCase();
  return tabs.filter(
    (tab): tab is LiveTab & { id: number } =>
      typeof tab.id === 'number' &&
      isRestorableUrl(tab.url) &&
      (!needle || (tab.title + ' ' + tab.url).toLowerCase().includes(needle)),
  );
};
