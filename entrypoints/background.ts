import { browser } from 'wxt/browser';
import type { BackgroundRequest, BackgroundResponse, LiveTab } from '../src/browser/messages';
import { createId } from '../src/domain/defaults';
import {
  createCollectionFromTabs,
  createRestorePlan,
  isRestorableUrl,
} from '../src/domain/library';
import type { CapturedBrowserTab, Collection, SavedLink } from '../src/domain/types';
import { getLibrary, updateLibrary } from '../src/storage/libraryStore';

const DASHBOARD_PATH = '/dashboard.html';
const SNAPSHOT_ALARM = 'tabitha-recovery-snapshot';

const openDashboard = async (route = ''): Promise<void> => {
  const base = browser.runtime.getURL(DASHBOARD_PATH);
  const tabs = await browser.tabs.query({});
  const existing = tabs.find((tab) => tab.url?.startsWith(base));
  if (existing?.id !== undefined) {
    await browser.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined)
      await browser.windows.update(existing.windowId, { focused: true });
    if (route) await browser.tabs.update(existing.id, { url: `${base}#/${route}` });
    return;
  }
  await browser.tabs.create({ url: `${base}${route ? `#/${route}` : ''}` });
};

const selectedWorkspaceId = async (requested?: string): Promise<string> => {
  const state = await getLibrary();
  const workspace =
    state.workspaces.find((item) => item.id === requested && !item.trashedAt) ??
    state.workspaces.find((item) => !item.trashedAt);
  if (!workspace) throw new Error('Create a workspace before saving browser tabs.');
  return workspace.id;
};

const captureWindow = async (
  requestedWorkspaceId?: string,
  name?: string,
  automatic = false,
): Promise<Collection> => {
  const workspaceId = await selectedWorkspaceId(requestedWorkspaceId);
  const tabs = (await browser.tabs.query({ currentWindow: true })) as CapturedBrowserTab[];
  let created: Collection | undefined;
  await updateLibrary((state) => {
    created = createCollectionFromTabs(
      state,
      workspaceId,
      name ?? (automatic ? 'Automatic recovery' : ''),
      tabs,
      automatic,
    );
    const collections = automatic
      ? [
          created,
          ...state.collections
            .filter((item) => !(item.automatic && item.workspaceId === workspaceId))
            .slice(0, 49),
        ]
      : [...state.collections, created];
    return { ...state, collections };
  });
  if (!created) throw new Error('The window could not be saved.');
  return created;
};

const captureActiveLink = async (requestedWorkspaceId?: string): Promise<SavedLink> => {
  const workspaceId = await selectedWorkspaceId(requestedWorkspaceId);
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !isRestorableUrl(tab.url)) throw new Error('This browser page cannot be saved.');
  const now = Date.now();
  const link: SavedLink = {
    id: createId(),
    workspaceId,
    name: tab.title?.trim() || new URL(tab.url).hostname,
    url: tab.url,
    description: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
  await updateLibrary((state) => ({
    ...state,
    links: [...state.links, { ...link, order: state.links.length }],
  }));
  return link;
};

const restoreCollection = async (collectionId: string): Promise<string> => {
  const state = await getLibrary();
  const collection = state.collections.find((item) => item.id === collectionId && !item.trashedAt);
  if (!collection) throw new Error('That saved session no longer exists.');
  const current = await browser.tabs.query({});
  const plan = createRestorePlan(
    collection.tabs,
    current.flatMap((tab) => (tab.url ? [tab.url] : [])),
    state.settings.deduplicateOnRestore,
  );
  if (plan.urls.length === 0) {
    return plan.skippedDuplicates > 0
      ? 'Every saved tab is already open.'
      : 'No restorable tabs were found.';
  }
  if (state.settings.restoreInNewWindow) {
    await browser.windows.create({ url: plan.urls });
  } else {
    for (const url of plan.urls) await browser.tabs.create({ url, active: false });
  }
  await updateLibrary((currentState) => ({
    ...currentState,
    collections: currentState.collections.map((item) =>
      item.id === collectionId
        ? { ...item, lastOpenedAt: Date.now(), updatedAt: Date.now() }
        : item,
    ),
  }));
  const duplicateMessage = plan.skippedDuplicates
    ? ` ${plan.skippedDuplicates} duplicate${plan.skippedDuplicates === 1 ? ' was' : 's were'} skipped.`
    : '';
  return `Restored ${plan.urls.length} tab${plan.urls.length === 1 ? '' : 's'}.${duplicateMessage}`;
};

const getLiveTabs = async (): Promise<LiveTab[]> => {
  const tabs = await browser.tabs.query({});
  return tabs.flatMap((tab) =>
    tab.url && isRestorableUrl(tab.url)
      ? [
          {
            ...(tab.id === undefined ? {} : { id: tab.id }),
            ...(tab.windowId === undefined ? {} : { windowId: tab.windowId }),
            title: tab.title?.trim() || tab.url,
            url: tab.url,
            ...(tab.favIconUrl ? { favIconUrl: tab.favIconUrl } : {}),
            active: Boolean(tab.active),
            pinned: Boolean(tab.pinned),
          },
        ]
      : [],
  );
};

const refreshSnapshotAlarm = async (): Promise<void> => {
  const state = await getLibrary();
  await browser.alarms.clear(SNAPSHOT_ALARM);
  if (state.settings.automaticSnapshots) {
    await browser.alarms.create(SNAPSHOT_ALARM, {
      periodInMinutes: Math.max(5, state.settings.snapshotIntervalMinutes),
    });
  }
};

const createMenus = async (): Promise<void> => {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: 'tabitha-save-page',
    title: 'Save page to Tabitha',
    contexts: ['page'],
  });
  browser.contextMenus.create({
    id: 'tabitha-save-window',
    title: 'Save this window to Tabitha',
    contexts: ['page'],
  });
  browser.contextMenus.create({
    id: 'tabitha-open',
    title: 'Open Tabitha Workspaces',
    contexts: ['action', 'page'],
  });
};

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void createMenus();
    void refreshSnapshotAlarm();
  });

  browser.commands.onCommand.addListener((command) => {
    if (command === 'open-dashboard') void openDashboard();
    if (command === 'save-current-window') void captureWindow();
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'tabitha-open') void openDashboard();
    if (info.menuItemId === 'tabitha-save-page') void captureActiveLink();
    if (info.menuItemId === 'tabitha-save-window') void captureWindow();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SNAPSHOT_ALARM) void captureWindow(undefined, 'Automatic recovery', true);
  });

  browser.storage.onChanged.addListener((_changes, area) => {
    if (area === 'local') void refreshSnapshotAlarm();
  });

  browser.runtime.onMessage.addListener((request: BackgroundRequest): Promise<BackgroundResponse> =>
    (async () => {
      try {
        switch (request.type) {
          case 'open-dashboard':
            await openDashboard(request.route);
            return { ok: true };
          case 'capture-window': {
            const collection = await captureWindow(
              request.workspaceId,
              request.name,
              request.automatic,
            );
            return { ok: true, collection };
          }
          case 'capture-active-link':
            await captureActiveLink(request.workspaceId);
            return { ok: true };
          case 'restore-collection':
            return { ok: true, message: await restoreCollection(request.collectionId) };
          case 'get-live-tabs':
            return { ok: true, tabs: await getLiveTabs() };
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unexpected extension error.',
        };
      }
    })(),
  );
});
