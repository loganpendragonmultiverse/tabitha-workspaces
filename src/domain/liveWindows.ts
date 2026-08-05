export interface WindowedTab {
  windowId?: number;
}

export interface LiveWindowGroup<T extends WindowedTab> {
  key: string;
  windowId: number | undefined;
  tabs: T[];
}

/** Group current tabs without treating a missing browser window ID as multiple windows. */
export const groupLiveTabs = <T extends WindowedTab>(tabs: T[]): LiveWindowGroup<T>[] => {
  const groups = new Map<string, LiveWindowGroup<T>>();
  for (const tab of tabs) {
    const key = tab.windowId === undefined ? 'window-unknown' : `window-${tab.windowId}`;
    const group: LiveWindowGroup<T> = groups.get(key) ?? {
      key,
      windowId: tab.windowId,
      tabs: [],
    };
    group.tabs.push(tab);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** Update only the currently visible window keys, preserving unrelated session state. */
export const setCollapsedWindowKeys = <T extends WindowedTab>(
  current: string[],
  windows: LiveWindowGroup<T>[],
  collapsed: boolean,
): string[] => {
  const visibleKeys = new Set(windows.map((window) => window.key));
  const next = new Set(current);
  visibleKeys.forEach((key) => (collapsed ? next.add(key) : next.delete(key)));
  return [...next];
};
