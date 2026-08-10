import { browser } from 'wxt/browser';
import type { BackgroundRequest, BackgroundResponse, LiveTab } from '../src/browser/messages';
import { createId } from '../src/domain/defaults';
import { insertCollectionAtTop } from '../src/domain/collectionOrder';
import {
  createCollectionFromTabs,
  createRestorePlan,
  isRestorableUrl,
} from '../src/domain/library';
import type { CapturedBrowserTab, Collection, SavedLink } from '../src/domain/types';
import {
  getCloudSyncConfig,
  publicCloudSyncConfig,
  setCloudSyncConfig,
} from '../src/storage/cloudSyncStore';
import {
  getLibrary,
  getStoredLibrary,
  replaceStoredLibrary,
  updateLibrary,
} from '../src/storage/libraryStore';
import { synchronizeWebDav, type SyncDirection } from '../src/sync/webdav';

const DASHBOARD_PATH = '/dashboard.html';
const SNAPSHOT_ALARM = 'tabitha-recovery-snapshot';
const CLOUD_SYNC_ALARM = 'tabitha-cloud-sync';

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
    state.workspaces.find(
      (item) => item.id === state.settings.selectedWorkspaceId && !item.trashedAt,
    ) ??
    state.workspaces.find(
      (item) => item.id === state.settings.homeWorkspaceId && !item.trashedAt,
    ) ??
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
    const previous = automatic
      ? state.collections
          .filter((item) => !(item.automatic && item.workspaceId === workspaceId))
          .slice(0, 49)
      : state.collections;
    const collections = insertCollectionAtTop(previous, created);
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
  if (!collection) throw new Error('That collection no longer exists.');
  const current = await browser.tabs.query({});
  const plan = createRestorePlan(
    collection.tabs,
    current.flatMap((tab) => (tab.url ? [tab.url] : [])),
    state.settings.deduplicateOnRestore,
  );
  if (plan.urls.length === 0) {
    return plan.skippedDuplicates > 0
      ? 'Every saved tab is already open. Turn off “Skip tabs that are already open” in Settings to allow another copy.'
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

const openUrl = async (url: string): Promise<void> => {
  if (!isRestorableUrl(url)) throw new Error('That saved URL cannot be opened by an extension.');
  await browser.tabs.create({ url });
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

const refreshCloudSyncAlarm = async (): Promise<void> => {
  const config = await getCloudSyncConfig();
  await browser.alarms.clear(CLOUD_SYNC_ALARM);
  if (config.enabled && config.url) {
    await browser.alarms.create(CLOUD_SYNC_ALARM, { periodInMinutes: 5 });
  }
};

const syncCloud = async (direction: SyncDirection): Promise<string> => {
  const config = await getCloudSyncConfig();
  if (direction === 'auto' && !config.enabled) return 'Automatic cloud sync is disabled.';
  if (!config.url) throw new Error('Add a WebDAV backup URL in Settings first.');
  try {
    const result = await synchronizeWebDav(config, await getStoredLibrary(), direction);
    if (result.action === 'downloaded') await replaceStoredLibrary(result.library);
    await setCloudSyncConfig({
      ...config,
      lastSyncedAt: Date.now(),
      lastSyncedFingerprint: result.fingerprint,
      ...(result.etag ? { lastRemoteEtag: result.etag } : {}),
      lastError: null,
    });
    if (result.action === 'uploaded') return 'Cloud backup updated.';
    if (result.action === 'downloaded') return 'Cloud backup restored.';
    return 'Cloud backup is already up to date.';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloud sync failed.';
    await setCloudSyncConfig({ ...config, lastError: message });
    throw error;
  }
};

const isNewTabUrl = (value?: string): boolean =>
  Boolean(
    value &&
    [
      'chrome://newtab/',
      'edge://newtab/',
      'brave://newtab/',
      'vivaldi://newtab/',
      'about:newtab',
    ].includes(value),
  );

const maybeOpenDashboardForNewTab = async (tab: {
  id?: number | undefined;
  url?: string | undefined;
  pendingUrl?: string | undefined;
}) => {
  if (tab.id === undefined || !isNewTabUrl(tab.pendingUrl ?? tab.url)) return;
  const state = await getLibrary();
  if (state.settings.openDashboardOnNewTab)
    await browser.tabs.update(tab.id, { url: browser.runtime.getURL(DASHBOARD_PATH) });
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
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  browser.runtime.onInstalled.addListener(() => {
    void createMenus();
    void refreshSnapshotAlarm();
    void refreshCloudSyncAlarm();
  });

  browser.runtime.onStartup.addListener(() => {
    void refreshCloudSyncAlarm();
    void syncCloud('auto').catch(() => undefined);
  });

  browser.tabs.onCreated.addListener((tab) => {
    void maybeOpenDashboardForNewTab(tab);
  });

  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url && isNewTabUrl(changeInfo.url)) void maybeOpenDashboardForNewTab(tab);
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
    if (alarm.name === CLOUD_SYNC_ALARM) void syncCloud('auto').catch(() => undefined);
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    void refreshSnapshotAlarm();
    if (!Object.keys(changes).some((key) => key.includes('library-v1'))) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => void syncCloud('auto').catch(() => undefined), 1500);
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
          case 'open-url':
            await openUrl(request.url);
            return { ok: true };
          case 'get-live-tabs':
            return { ok: true, tabs: await getLiveTabs() };
          case 'get-cloud-sync-config':
            return { ok: true, syncConfig: publicCloudSyncConfig(await getCloudSyncConfig()) };
          case 'save-cloud-sync-config': {
            const config = await setCloudSyncConfig(request.config);
            await refreshCloudSyncAlarm();
            return { ok: true, syncConfig: publicCloudSyncConfig(config) };
          }
          case 'sync-cloud':
            return { ok: true, message: await syncCloud(request.direction) };
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
