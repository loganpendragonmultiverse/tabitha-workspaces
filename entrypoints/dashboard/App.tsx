import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import type {
  BackgroundRequest,
  BackgroundResponse,
  CloudSyncPublicConfig,
  LiveTab,
} from '../../src/browser/messages';
import { createId } from '../../src/domain/defaults';
import { applyWorkspaceLayout } from '../../src/domain/collectionView';
import { reorderVisibleCollections, sortCollections } from '../../src/domain/collectionOrder';
import {
  mergeFolderExport,
  parseFolderExport,
  parseLibraryExport,
  serializeFolder,
  serializeLibrary,
} from '../../src/domain/importExport';
import {
  extractWikiLinks,
  markTrashed,
  normalizeTags,
  noteBacklinks,
  purgeTrash,
  removeSavedTab,
  reorderEntities,
  restoreTrashed,
  searchLibrary,
  updateSavedTab,
} from '../../src/domain/library';
import { groupLiveTabs, setCollapsedWindowKeys } from '../../src/domain/liveWindows';
import { resolveDashboardView, type DashboardView } from '../../src/domain/navigation';
import { insertWorkspaceNearTop, sortWorkspaces } from '../../src/domain/workspaceOrder';
import type {
  BaseEntity,
  Collection,
  CollectionSortMode,
  EntityKind,
  Folder,
  LibraryState,
  Note,
  SavedLink,
  SearchResult,
  SearchScope,
  Settings,
  Workspace,
} from '../../src/domain/types';
import {
  getLibrary,
  getStoredLibrary,
  libraryItem,
  lockFolder,
  protectFolder,
  removeFolderProtection,
  replaceStoredLibrary,
  setLibrary,
  unlockFolder,
} from '../../src/storage/libraryStore';

type View = DashboardView;
type EditableKind = 'workspace' | 'folder' | 'collection' | 'link' | 'note';
interface EditorTarget {
  kind: EditableKind;
  id?: string;
}
type PasswordAction = { folder: Folder; mode: 'protect' | 'unlock' | 'remove' };

const PRIMARY_NAV: { id: View; label: string; icon: string }[] = [
  { id: 'links', label: 'Saved links', icon: '↗' },
  { id: 'notes', label: 'Notes', icon: '✎' },
];
const UTILITY_NAV: { id: View; label: string; icon: string }[] = [
  { id: 'trash', label: 'Recycle bin', icon: '♲' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];
const APP_VERSION = browser.runtime.getManifest().version;

const send = async (request: BackgroundRequest): Promise<BackgroundResponse> =>
  browser.runtime.sendMessage(request);

const active = <T extends BaseEntity>(items: T[]): T[] =>
  items.filter((item) => !item.trashedAt).sort((left, right) => left.order - right.order);

const timeLabel = (timestamp?: number): string => {
  if (!timestamp) return 'Never';
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return 'Just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

const download = (filename: string, contents: string): void => {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const fileSafeName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'folder';

export function App() {
  const [library, setLocalLibrary] = useState<LibraryState | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [view, setView] = useState<View>(() => resolveDashboardView(location.hash));
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [liveTabs, setLiveTabs] = useState<LiveTab[]>([]);
  const [collapsedLiveWindowKeys, setCollapsedLiveWindowKeys] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [renamingCollectionId, setRenamingCollectionId] = useState('');
  const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(null);
  const [dragged, setDragged] = useState<{ kind: 'workspace' | 'collection'; id: string } | null>(
    null,
  );
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getLibrary().then((state) => {
      setLocalLibrary(state);
      const selected =
        state.workspaces.find(
          (item) => item.id === state.settings.selectedWorkspaceId && !item.trashedAt,
        ) ?? active(state.workspaces)[0];
      setSelectedWorkspaceId(selected?.id ?? '');
      setSelectedFolderId(selected?.folderId ?? active(state.folders)[0]?.id ?? '');
    });
    return libraryItem.watch(() => void getLibrary().then(setLocalLibrary));
  }, []);

  useEffect(() => {
    location.hash = `/${view}`;
    if (view === 'windows') void refreshLiveTabs();
  }, [view]);

  useEffect(() => {
    if (view !== 'windows') return;
    const interval = window.setInterval(() => void refreshLiveTabs(), 3000);
    return () => window.clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!library) return;
    if (!library.workspaces.some((item) => item.id === selectedWorkspaceId && !item.trashedAt)) {
      setSelectedWorkspaceId(active(library.workspaces)[0]?.id ?? '');
    }
  }, [library, selectedWorkspaceId]);

  const persist = async (next: LibraryState): Promise<void> => {
    setLocalLibrary(await setLibrary(next));
  };

  const selectWorkspace = async (workspaceId: string): Promise<void> => {
    if (!library) return;
    const workspace = library.workspaces.find((item) => item.id === workspaceId && !item.trashedAt);
    if (!workspace) return;
    setSelectedWorkspaceId(workspace.id);
    setSelectedFolderId(workspace.folderId);
    setView('overview');
    if (library.settings.selectedWorkspaceId !== workspace.id) {
      await persist({
        ...library,
        settings: { ...library.settings, selectedWorkspaceId: workspace.id },
      });
    }
  };

  const searchResults = useMemo(
    () => (library && query.trim() ? searchLibrary(library, query, searchScope) : []),
    [library, query, searchScope],
  );

  const refreshLiveTabs = async (): Promise<void> => {
    const response = await send({ type: 'get-live-tabs' });
    if (response.ok) setLiveTabs(response.tabs ?? []);
    else setToast(response.error);
  };

  const captureWindow = async (): Promise<void> => {
    const response = await send({ type: 'capture-window', workspaceId: selectedWorkspaceId });
    setToast(
      response.ok
        ? `Saved ${response.collection?.tabs.length ?? 0} tabs as a collection.`
        : response.error,
    );
    if (response.ok) {
      setView('overview');
      setRenamingCollectionId(response.collection?.id ?? '');
    }
  };

  const restoreCollection = async (collection: Collection): Promise<void> => {
    if (
      library?.settings.confirmBeforeRestore &&
      !confirm(`Restore “${collection.name}” with ${collection.tabs.length} tabs?`)
    )
      return;
    const response = await send({ type: 'restore-collection', collectionId: collection.id });
    setToast(response.ok ? (response.message ?? 'Collection restored.') : response.error);
  };

  const trash = async (kind: EntityKind, id: string): Promise<void> => {
    if (!library) return;
    if (kind === 'workspace' && id === library.settings.homeWorkspaceId) {
      setToast('Home is permanent, but you can rename it whenever you like.');
      return;
    }
    if (
      kind === 'folder' &&
      library.workspaces.some(
        (workspace) =>
          workspace.id === library.settings.homeWorkspaceId && workspace.folderId === id,
      )
    ) {
      setToast('Move Home to another folder before deleting this folder.');
      return;
    }
    if (kind === 'folder' && active(library.folders).length === 1) {
      setToast('Create another folder before deleting this one.');
      return;
    }
    await persist(markTrashed(library, kind, id));
    setToast('Moved to the recycle bin.');
  };

  const restoreEntity = async (kind: EntityKind, id: string): Promise<void> => {
    if (!library) return;
    await persist(restoreTrashed(library, kind, id));
    setToast('Item restored.');
  };

  const handleDrop = async (kind: 'workspace' | 'collection', targetId: string): Promise<void> => {
    if (!library || dragged?.kind !== kind) return;
    if (kind === 'workspace') {
      await persist({
        ...library,
        workspaces: reorderEntities(library.workspaces, dragged.id, targetId),
      });
    } else {
      const sortMode = library.settings.collectionSortByWorkspace[selectedWorkspaceId] ?? 'custom';
      const scoped = sortCollections(
        library.collections.filter(
          (item) => item.workspaceId === selectedWorkspaceId && !item.trashedAt,
        ),
        sortMode,
      );
      const reordered = reorderVisibleCollections(scoped, dragged.id, targetId);
      const byId = new Map(reordered.map((item) => [item.id, item]));
      await persist({
        ...library,
        collections: library.collections.map((item) => byId.get(item.id) ?? item),
        settings: {
          ...library.settings,
          collectionSortByWorkspace: {
            ...library.settings.collectionSortByWorkspace,
            [selectedWorkspaceId]: 'custom',
          },
        },
      });
    }
    setDragged(null);
  };

  const moveCollectionToWorkspace = async (workspaceId: string): Promise<void> => {
    if (!library || dragged?.kind !== 'collection') return;
    const now = Date.now();
    await persist({
      ...library,
      collections: library.collections.map((item) => {
        if (item.id !== dragged.id) return item;
        const moved = { ...item, workspaceId, updatedAt: now };
        delete moved.folderId;
        return moved;
      }),
    });
    setDragged(null);
    setToast('Collection moved to the selected workspace.');
  };

  const openSearchResult = (result: SearchResult): void => {
    if (result.kind === 'tab' || result.kind === 'link') {
      void send({ type: 'open-url', url: result.url ?? result.detail }).then(
        (response) => !response.ok && setToast(response.error),
      );
    } else if (result.kind === 'workspace') void selectWorkspace(result.id);
    else if (result.workspaceId) {
      const workspace = library?.workspaces.find((item) => item.id === result.workspaceId);
      if (workspace && library) {
        setSelectedWorkspaceId(workspace.id);
        setSelectedFolderId(workspace.folderId);
        setView(result.kind === 'note' ? 'notes' : 'overview');
        void persist({
          ...library,
          settings: {
            ...library.settings,
            selectedWorkspaceId: workspace.id,
            collapsedCollectionIds:
              result.kind === 'collection'
                ? library.settings.collapsedCollectionIds.filter((id) => id !== result.id)
                : library.settings.collapsedCollectionIds,
          },
        });
      }
    } else if (result.kind === 'folder' && library) {
      setSelectedFolderId(result.id);
      void persist({
        ...library,
        settings: {
          ...library.settings,
          collapsedFolderIds: library.settings.collapsedFolderIds.filter((id) => id !== result.id),
        },
      });
    }
    setQuery('');
  };

  const importBackup = async (file?: File): Promise<void> => {
    if (!file || !library) return;
    try {
      const input = await file.text();
      let envelope: { format?: string };
      try {
        envelope = JSON.parse(input) as { format?: string };
      } catch {
        throw new Error('The selected file is not valid JSON.');
      }
      if (envelope.format === 'tabitha-workspaces-folder') {
        const folderBackup = parseFolderExport(input);
        if (
          !confirm(
            `Import the folder “${folderBackup.folder.name}”? A folder with the same identity will be replaced.`,
          )
        )
          return;
        const stored = mergeFolderExport(await getStoredLibrary(), folderBackup);
        const runtime = await replaceStoredLibrary(stored);
        setLocalLibrary(runtime);
        setSelectedWorkspaceId(active(runtime.workspaces)[0]?.id ?? '');
        setToast('Folder backup imported successfully.');
      } else {
        const imported = parseLibraryExport(input);
        if (
          !confirm(
            'Replace the current library with this backup? Export your current library first if needed.',
          )
        )
          return;
        const runtime = await replaceStoredLibrary(imported);
        setLocalLibrary(runtime);
        setSelectedWorkspaceId(active(runtime.workspaces)[0]?.id ?? '');
        setToast('Library backup imported successfully.');
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'The backup could not be imported.');
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };

  if (!library)
    return (
      <div class="loading">
        <span class="brand-mark">T</span>Loading Tabitha…
      </div>
    );
  const visibleWorkspaces = sortWorkspaces(
    active(library.workspaces).filter(
      (workspace) =>
        !showStarredOnly || workspace.starred || workspace.id === library.settings.homeWorkspaceId,
    ),
    library.settings.homeWorkspaceId,
  );
  const visibleFolders = active(library.folders);

  return (
    <div
      class={`app density-${library.settings.density}`}
      data-theme={library.settings.theme}
      style={{ '--accent': library.settings.accent }}
    >
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">T</span>
          <div>
            <strong>Tabitha</strong>
            <small>Workspaces</small>
          </div>
        </div>
        <nav class="mode-switch" aria-label="Saved and live browser state">
          <button
            class={view === 'windows' ? '' : 'active'}
            aria-pressed={view !== 'windows'}
            onClick={() => setView('overview')}
          >
            <span aria-hidden="true">⌂</span>
            <strong>Workspaces</strong>
            <small>Saved collections</small>
          </button>
          <button
            class={view === 'windows' ? 'active' : ''}
            aria-pressed={view === 'windows'}
            onClick={() => setView('windows')}
          >
            <span aria-hidden="true">◎</span>
            <strong>Open windows</strong>
            <small>{new Set(liveTabs.map((tab) => tab.windowId)).size || 'Live'}</small>
          </button>
        </nav>
        <nav class="primary-nav" aria-label="Main navigation">
          {PRIMARY_NAV.map((item) => (
            <button class={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div class="section-label">
          <span>Folders</span>
          <div>
            <button
              class={showStarredOnly ? 'active' : ''}
              title={showStarredOnly ? 'Show every workspace' : 'Show starred workspaces only'}
              onClick={() => setShowStarredOnly((value) => !value)}
            >
              Star
            </button>
            <button title="New folder" onClick={() => setEditor({ kind: 'folder' })}>
              ＋
            </button>
            <button
              title="New workspace"
              disabled={!visibleFolders.some((folder) => !folder.locked)}
              onClick={() => setEditor({ kind: 'workspace' })}
            >
              W
            </button>
          </div>
        </div>
        <div class="folder-tree">
          {visibleFolders.map((folder) => {
            const collapsed = library.settings.collapsedFolderIds.includes(folder.id);
            const folderWorkspaces = visibleWorkspaces.filter(
              (workspace) => workspace.folderId === folder.id,
            );
            return (
              <section
                class={`folder-node${folder.locked ? ' locked' : ''}${selectedFolderId === folder.id ? ' selected' : ''}`}
              >
                <div class="folder-heading">
                  <button
                    class="folder-name"
                    aria-expanded={!collapsed}
                    onClick={() => {
                      if (folder.locked) {
                        setPasswordAction({ folder, mode: 'unlock' });
                        return;
                      }
                      setSelectedFolderId(folder.id);
                      const folderWorkspace =
                        folderWorkspaces.find(
                          (workspace) => workspace.id === selectedWorkspaceId,
                        ) ?? folderWorkspaces[0];
                      if (folderWorkspace) {
                        setSelectedWorkspaceId(folderWorkspace.id);
                        setView('overview');
                      }
                      void persist({
                        ...library,
                        settings: {
                          ...library.settings,
                          selectedWorkspaceId:
                            folderWorkspace?.id ?? library.settings.selectedWorkspaceId,
                          collapsedFolderIds: collapsed
                            ? library.settings.collapsedFolderIds.filter((id) => id !== folder.id)
                            : [...library.settings.collapsedFolderIds, folder.id],
                        },
                      });
                    }}
                    onDblClick={() =>
                      folder.locked
                        ? setPasswordAction({ folder, mode: 'unlock' })
                        : setEditor({ kind: 'folder', id: folder.id })
                    }
                    title={
                      folder.locked
                        ? 'Unlock folder'
                        : 'Click to expand or collapse; double-click to edit'
                    }
                  >
                    <span>{folder.locked ? '🔒' : '▾'}</span>
                    {folder.name}
                  </button>
                  <button
                    class="folder-security"
                    title={
                      folder.protection
                        ? folder.locked
                          ? 'Unlock folder'
                          : 'Lock folder'
                        : 'Protect folder'
                    }
                    onClick={() =>
                      void (folder.protection
                        ? folder.locked
                          ? setPasswordAction({ folder, mode: 'unlock' })
                          : lockFolder(folder.id).then((next) => {
                              setLocalLibrary(next);
                              setToast('Folder locked.');
                            })
                        : setPasswordAction({ folder, mode: 'protect' }))
                    }
                  >
                    {folder.protection ? (folder.locked ? 'Unlock' : 'Lock') : 'Protect'}
                  </button>
                  {folder.protection && !folder.locked && (
                    <button
                      class="folder-security remove"
                      title="Remove password protection"
                      onClick={() => setPasswordAction({ folder, mode: 'remove' })}
                    >
                      Remove
                    </button>
                  )}
                  <button
                    class="folder-security remove"
                    title={`Move ${folder.name} to the recycle bin`}
                    aria-label={`Delete ${folder.name}`}
                    onClick={() => {
                      if (confirm(`Move “${folder.name}” and its workspaces to the recycle bin?`))
                        void trash('folder', folder.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
                {!collapsed && (
                  <div class="workspace-list">
                    {folderWorkspaces.map((item) => (
                      <div
                        class="workspace-row"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() =>
                          void (dragged?.kind === 'collection'
                            ? moveCollectionToWorkspace(item.id)
                            : handleDrop('workspace', item.id))
                        }
                      >
                        <button
                          draggable
                          class={item.id === selectedWorkspaceId ? 'workspace active' : 'workspace'}
                          onDragStart={(event) => {
                            if (event.dataTransfer) {
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('text/plain', item.id);
                            }
                            setDragged({ kind: 'workspace', id: item.id });
                          }}
                          onClick={() => void selectWorkspace(item.id)}
                        >
                          <i style={{ background: item.color }} />
                          <span>{item.name}</span>
                          {item.id === library.settings.homeWorkspaceId && <em>Home</em>}
                        </button>
                        <button
                          class="workspace-action"
                          title={item.pinned ? 'Unpin workspace' : 'Pin workspace'}
                          onClick={() =>
                            void persist({
                              ...library,
                              workspaces: library.workspaces.map((workspace) =>
                                workspace.id === item.id
                                  ? { ...workspace, pinned: !workspace.pinned }
                                  : workspace,
                              ),
                            })
                          }
                        >
                          {item.pinned ? 'Pinned' : 'Pin'}
                        </button>
                        <button
                          class="workspace-action"
                          title={item.starred ? 'Remove star' : 'Star workspace'}
                          onClick={() =>
                            void persist({
                              ...library,
                              workspaces: library.workspaces.map((workspace) =>
                                workspace.id === item.id
                                  ? { ...workspace, starred: !workspace.starred }
                                  : workspace,
                              ),
                            })
                          }
                        >
                          {item.starred ? 'Starred' : 'Star'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <nav class="utility-nav">
          {UTILITY_NAV.map((item) => (
            <button class={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <p class="privacy-note">
          <span>●</span> Stored only in this browser <em>v{APP_VERSION}</em>
        </p>
      </aside>

      <main>
        <header class="topbar">
          <div class="search-wrap">
            <span>⌕</span>
            <input
              value={query}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search workspaces, collections, and URLs…"
              aria-label="Search library"
            />
            <select
              class="search-scope"
              value={searchScope}
              onChange={(event) => setSearchScope(event.currentTarget.value as SearchScope)}
              aria-label="Filter search results"
            >
              <option value="all">All</option>
              <option value="workspace">Workspaces</option>
              <option value="collection">Collections</option>
              <option value="url">URLs</option>
            </select>
            {query && (
              <div class="search-results">
                {searchResults.length === 0 ? (
                  <p>No saved content matched.</p>
                ) : (
                  searchResults.slice(0, 50).map((result) => (
                    <button onClick={() => openSearchResult(result)}>
                      <span class="result-kind">{result.kind}</span>
                      <strong>{result.name}</strong>
                      <small>{result.detail.slice(0, 90)}</small>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button class="button ghost" onClick={() => void captureWindow()}>
            Save window
          </button>
          <button
            class="button primary"
            onClick={() =>
              setEditor({
                kind: view === 'notes' ? 'note' : view === 'links' ? 'link' : 'collection',
              })
            }
          >
            ＋ Add new
          </button>
        </header>

        <div class="content">
          {view === 'overview' && (
            <Overview
              library={library}
              workspaceId={selectedWorkspaceId}
              onView={setView}
              onRestore={restoreCollection}
              onEdit={setEditor}
              onTrash={trash}
              onCapture={captureWindow}
              onDrag={setDragged}
              onDrop={handleDrop}
              onUpdate={(collection) =>
                persist({
                  ...library,
                  collections: library.collections.map((item) =>
                    item.id === collection.id ? collection : item,
                  ),
                })
              }
              onLayoutChange={(sessionLayout) =>
                void persist({
                  ...library,
                  settings: applyWorkspaceLayout(
                    library.settings,
                    library.collections,
                    selectedWorkspaceId,
                    sessionLayout,
                  ),
                })
              }
              onSortChange={(collectionSort) =>
                void persist({
                  ...library,
                  settings: {
                    ...library.settings,
                    collectionSortByWorkspace: {
                      ...library.settings.collectionSortByWorkspace,
                      [selectedWorkspaceId]: collectionSort,
                    },
                  },
                })
              }
              onCollapsedChange={(collapsedCollectionIds) =>
                void persist({
                  ...library,
                  settings: { ...library.settings, collapsedCollectionIds },
                })
              }
              renamingCollectionId={renamingCollectionId}
              onRenameComplete={() => setRenamingCollectionId('')}
              onDismissWelcome={() =>
                void persist({
                  ...library,
                  settings: { ...library.settings, showWelcomeBanner: false },
                })
              }
            />
          )}
          {view === 'links' && (
            <Links
              library={library}
              workspaceId={selectedWorkspaceId}
              onEdit={setEditor}
              onTrash={trash}
            />
          )}
          {view === 'notes' && (
            <Notes
              library={library}
              workspaceId={selectedWorkspaceId}
              onEdit={setEditor}
              onTrash={trash}
            />
          )}
          {view === 'windows' && (
            <LiveTabs
              tabs={liveTabs}
              collapsedWindowKeys={collapsedLiveWindowKeys}
              onCollapsedChange={setCollapsedLiveWindowKeys}
              onRefresh={refreshLiveTabs}
              onCapture={captureWindow}
            />
          )}
          {view === 'trash' && (
            <Trash
              library={library}
              onRestore={restoreEntity}
              onPurge={() => {
                if (confirm('Permanently delete everything in the recycle bin?'))
                  void persist(purgeTrash(library));
              }}
            />
          )}
          {view === 'settings' && (
            <SettingsView
              settings={library.settings}
              onChange={(settings) => void persist({ ...library, settings })}
              onExport={() =>
                void getStoredLibrary().then((stored) =>
                  download(
                    `tabitha-workspaces-${new Date().toISOString().slice(0, 10)}.json`,
                    serializeLibrary(stored),
                  ),
                )
              }
              onExportFolders={() =>
                void getStoredLibrary().then((stored) => {
                  const folders = active(stored.folders);
                  const date = new Date().toISOString().slice(0, 10);
                  folders.forEach((folder) =>
                    download(
                      `tabitha-${fileSafeName(folder.name)}-${folder.id.slice(0, 8)}-${date}.json`,
                      serializeFolder(stored, folder.id),
                    ),
                  );
                  setToast(`Exported ${folders.length} separate folder backups.`);
                })
              }
              onImport={() => importInput.current?.click()}
            />
          )}
        </div>
      </main>

      <input
        ref={importInput}
        class="hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void importBackup(event.currentTarget.files?.[0])}
      />
      {editor && (
        <EditorDialog
          target={editor}
          library={library}
          workspaceId={selectedWorkspaceId}
          selectedFolderId={selectedFolderId}
          onClose={() => setEditor(null)}
          onSave={async (next, entity) => {
            const stored = await setLibrary(next);
            setLocalLibrary(stored);
            if (editor.kind === 'folder') {
              setSelectedFolderId(entity.id);
              if (stored.settings.collapsedFolderIds.includes(entity.id)) {
                const expanded = await setLibrary({
                  ...stored,
                  settings: {
                    ...stored.settings,
                    collapsedFolderIds: stored.settings.collapsedFolderIds.filter(
                      (id) => id !== entity.id,
                    ),
                  },
                });
                setLocalLibrary(expanded);
              }
            }
            if (editor.kind === 'workspace') {
              setSelectedWorkspaceId(entity.id);
              setSelectedFolderId((entity as Workspace).folderId);
              const selected = await setLibrary({
                ...stored,
                settings: { ...stored.settings, selectedWorkspaceId: entity.id },
              });
              setLocalLibrary(selected);
            }
            setEditor(null);
            setToast('Saved.');
          }}
          onTrash={async (kind, id) => {
            await trash(kind, id);
            setEditor(null);
          }}
        />
      )}
      {passwordAction && (
        <PasswordDialog
          action={passwordAction}
          onClose={() => setPasswordAction(null)}
          onSubmit={async (password) => {
            try {
              const next =
                passwordAction.mode === 'protect'
                  ? await protectFolder(library, passwordAction.folder.id, password)
                  : passwordAction.mode === 'unlock'
                    ? await unlockFolder(passwordAction.folder, password)
                    : await removeFolderProtection(library, passwordAction.folder.id);
              setLocalLibrary(next);
              setPasswordAction(null);
              setToast(
                passwordAction.mode === 'protect'
                  ? 'Folder protected and encrypted.'
                  : passwordAction.mode === 'unlock'
                    ? 'Folder unlocked for this browser session.'
                    : 'Password protection removed.',
              );
            } catch (error) {
              setToast(error instanceof Error ? error.message : 'The folder could not be updated.');
            }
          }}
        />
      )}
      {toast && (
        <div class="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function PasswordDialog({
  action,
  onClose,
  onSubmit,
}: {
  action: PasswordAction;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const protecting = action.mode === 'protect';
  const removing = action.mode === 'remove';
  const submit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (protecting && password !== confirmation) {
      alert('The passwords do not match.');
      return;
    }
    setBusy(true);
    await onSubmit(password);
    setBusy(false);
  };
  return (
    <div class="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        class="modal password-dialog"
        onSubmit={(event) => void submit(event)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>Folder security</p>
            <h2>
              {protecting ? 'Protect' : removing ? 'Remove protection from' : 'Unlock'}{' '}
              {action.folder.name}
            </h2>
          </div>
          <button type="button" class="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {removing ? (
          <p>
            The folder will be decrypted and stored normally in this browser and in future backups.
          </p>
        ) : (
          <>
            <label>
              Password
              <input
                type="password"
                value={password}
                minlength={protecting ? 10 : undefined}
                autocomplete={protecting ? 'new-password' : 'current-password'}
                onInput={(event) => setPassword(event.currentTarget.value)}
                autofocus
                required
              />
            </label>
            {protecting && (
              <label>
                Confirm password
                <input
                  type="password"
                  value={confirmation}
                  minlength={10}
                  autocomplete="new-password"
                  onInput={(event) => setConfirmation(event.currentTarget.value)}
                  required
                />
              </label>
            )}
          </>
        )}
        <div class="security-note">
          {protecting
            ? 'Tabitha encrypts everything inside this folder with AES-256-GCM. There is no password recovery.'
            : removing
              ? 'This does not delete any workspaces, collections, links, or notes.'
              : 'The folder stays unlocked only for this browser session, or until you lock it.'}
        </div>
        <footer>
          <button type="button" class="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button class={`button ${removing ? 'danger' : 'primary'}`} disabled={busy}>
            {busy
              ? 'Working…'
              : protecting
                ? 'Encrypt folder'
                : removing
                  ? 'Remove protection'
                  : 'Unlock folder'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: preact.ComponentChildren;
}) {
  return (
    <div class="page-heading">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div class="heading-actions">{children}</div>
    </div>
  );
}

function Overview({
  library,
  workspaceId,
  onView,
  onRestore,
  onEdit,
  onTrash,
  onCapture,
  onDrag,
  onDrop,
  onUpdate,
  onLayoutChange,
  onSortChange,
  onCollapsedChange,
  renamingCollectionId,
  onRenameComplete,
  onDismissWelcome,
}: {
  library: LibraryState;
  workspaceId: string;
  onView: (view: View) => void;
  onRestore: (item: Collection) => Promise<void>;
  onEdit: (target: EditorTarget) => void;
  onTrash: (kind: EntityKind, id: string) => Promise<void>;
  onCapture: () => Promise<void>;
  onDrag: (value: { kind: 'collection'; id: string }) => void;
  onDrop: (kind: 'collection', id: string) => Promise<void>;
  onUpdate: (collection: Collection) => Promise<void>;
  onLayoutChange: (layout: Settings['sessionLayout']) => void;
  onSortChange: (sort: CollectionSortMode) => void;
  onCollapsedChange: (ids: string[]) => void;
  renamingCollectionId: string;
  onRenameComplete: () => void;
  onDismissWelcome: () => void;
}) {
  const workspace = library.workspaces.find((item) => item.id === workspaceId);
  const collections = active(
    library.collections.filter((item) => item.workspaceId === workspaceId),
  );
  const links = active(library.links.filter((item) => item.workspaceId === workspaceId));
  const notes = active(library.notes.filter((item) => item.workspaceId === workspaceId));
  const tabs = collections.reduce((count, item) => count + item.tabs.length, 0);
  return (
    <>
      <PageHeading eyebrow="Workspace overview" title={workspace?.name ?? 'Workspace'}>
        <button class="button ghost" onClick={() => onEdit({ kind: 'workspace', id: workspaceId })}>
          Edit workspace
        </button>
      </PageHeading>
      {library.settings.showWelcomeBanner && (
        <section class="hero-card">
          <button
            class="hero-dismiss"
            onClick={onDismissWelcome}
            aria-label="Hide this welcome message"
          >
            Close
          </button>
          <div>
            <span class="hero-kicker">Your browser, organized</span>
            <h2>Pick up where you left off.</h2>
            <p>
              Collections, research links, and connected notes stay private and ready whenever you
              need them.
            </p>
            <button
              class="button light"
              onClick={() =>
                document
                  .getElementById('workspace-collections')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Browse collections ↓
            </button>
          </div>
          <div class="orbit" aria-hidden="true">
            <i />
            <i />
            <i />
            <strong>T</strong>
          </div>
        </section>
      )}
      <section class="stats-grid">
        <button onClick={() => document.getElementById('workspace-collections')?.scrollIntoView()}>
          <span>▣</span>
          <strong>{collections.length}</strong>
          <small>Collections</small>
        </button>
        <button onClick={() => document.getElementById('workspace-collections')?.scrollIntoView()}>
          <span>□</span>
          <strong>{tabs}</strong>
          <small>Saved tabs</small>
        </button>
        <button onClick={() => onView('links')}>
          <span>↗</span>
          <strong>{links.length}</strong>
          <small>Saved links</small>
        </button>
        <button onClick={() => onView('notes')}>
          <span>✎</span>
          <strong>{notes.length}</strong>
          <small>Connected notes</small>
        </button>
      </section>
      <Collections
        library={library}
        workspaceId={workspaceId}
        onRestore={onRestore}
        onEdit={onEdit}
        onTrash={onTrash}
        onCapture={onCapture}
        onDrag={onDrag}
        onDrop={onDrop}
        onUpdate={onUpdate}
        onLayoutChange={onLayoutChange}
        onSortChange={onSortChange}
        onCollapsedChange={onCollapsedChange}
        renamingCollectionId={renamingCollectionId}
        onRenameComplete={onRenameComplete}
      />
    </>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div class="empty">
      <span>✦</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

function Collections({
  library,
  workspaceId,
  onRestore,
  onEdit,
  onTrash,
  onCapture,
  onDrag,
  onDrop,
  onUpdate,
  onLayoutChange,
  onSortChange,
  onCollapsedChange,
  renamingCollectionId,
  onRenameComplete,
}: {
  library: LibraryState;
  workspaceId: string;
  onRestore: (item: Collection) => Promise<void>;
  onEdit: (target: EditorTarget) => void;
  onTrash: (kind: EntityKind, id: string) => Promise<void>;
  onCapture: () => Promise<void>;
  onDrag: (value: { kind: 'collection'; id: string }) => void;
  onDrop: (kind: 'collection', id: string) => Promise<void>;
  onUpdate: (collection: Collection) => Promise<void>;
  onLayoutChange: (layout: Settings['sessionLayout']) => void;
  onSortChange: (sort: CollectionSortMode) => void;
  onCollapsedChange: (ids: string[]) => void;
  renamingCollectionId: string;
  onRenameComplete: () => void;
}) {
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const sortMode = library.settings.collectionSortByWorkspace[workspaceId] ?? 'custom';
  const collections = sortCollections(
    active(
      library.collections.filter(
        (item) => item.workspaceId === workspaceId && (!showStarredOnly || item.starred),
      ),
    ),
    sortMode,
  );
  const collapsed = new Set(library.settings.collapsedCollectionIds);
  const toggle = (id: string): void => {
    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);
    onCollapsedChange([...collapsed]);
  };
  const setAllCollapsed = (value: boolean): void => {
    const scopedIds = new Set(collections.map((item) => item.id));
    const next = new Set(library.settings.collapsedCollectionIds);
    if (value) scopedIds.forEach((id) => next.add(id));
    else scopedIds.forEach((id) => next.delete(id));
    onCollapsedChange([...next]);
  };
  return (
    <section id="workspace-collections" class="workspace-collections">
      <div class="collections-heading">
        <div>
          <p>Saved browser state</p>
          <h2>Collections</h2>
          <small>
            {collections.length} {collections.length === 1 ? 'collection' : 'collections'} in this
            workspace
          </small>
        </div>
        <div class="heading-actions">
          <label class="collection-sort">
            <span>Order</span>
            <select
              aria-label="Collection order"
              value={sortMode}
              onChange={(event) => onSortChange(event.currentTarget.value as CollectionSortMode)}
            >
              <option value="custom">Custom</option>
              <option value="newest">Newest added</option>
              <option value="oldest">Oldest added</option>
              <option value="alphabetical">A–Z</option>
            </select>
          </label>
          <div class="view-toggle" aria-label="Collection layout">
            <button
              class={library.settings.sessionLayout === 'cards' ? 'active' : ''}
              onClick={() => onLayoutChange('cards')}
              title="Show cards and expand this workspace's collections"
            >
              Cards
            </button>
            <button
              class={library.settings.sessionLayout === 'compact' ? 'active' : ''}
              onClick={() => onLayoutChange('compact')}
              title="Show compact tiles and expand this workspace's collections"
            >
              Compact
            </button>
            <button
              class={library.settings.sessionLayout === 'list' ? 'active' : ''}
              onClick={() => onLayoutChange('list')}
              title="Show editable rows and expand this workspace's collections"
            >
              List
            </button>
          </div>
          <button
            class={`button ghost${showStarredOnly ? ' active' : ''}`}
            onClick={() => setShowStarredOnly((value) => !value)}
          >
            {showStarredOnly ? 'Show all' : 'Starred only'}
          </button>
          <button class="button primary" onClick={() => void onCapture()}>
            Save current window
          </button>
        </div>
      </div>
      {collections.length > 0 && (
        <div class="collection-controls">
          <button onClick={() => setAllCollapsed(false)}>Expand all</button>
          <button onClick={() => setAllCollapsed(true)}>Collapse all</button>
        </div>
      )}
      {collections.length === 0 ? (
        <Empty
          title="No collections yet"
          copy="Capture the current window or create an empty collection."
        />
      ) : (
        <div class={`session-groups layout-${library.settings.sessionLayout}`}>
          {collections.map((item) => (
            <CollectionGroup
              item={item}
              layout={library.settings.sessionLayout}
              collapsed={collapsed.has(item.id)}
              onToggle={() => toggle(item.id)}
              onSave={onUpdate}
              onRestore={onRestore}
              onEdit={() => onEdit({ kind: 'collection', id: item.id })}
              onTrash={() => void onTrash('collection', item.id)}
              renameRequested={renamingCollectionId === item.id}
              onRenameComplete={onRenameComplete}
              onDragStart={() => onDrag({ kind: 'collection', id: item.id })}
              onDrop={() => void onDrop('collection', item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CollectionGroup({
  item,
  layout,
  collapsed,
  onToggle,
  onSave,
  onRestore,
  onEdit,
  onTrash,
  renameRequested,
  onRenameComplete,
  onDragStart,
  onDrop,
}: {
  item: Collection;
  layout: Settings['sessionLayout'];
  collapsed: boolean;
  onToggle: () => void;
  onSave: (collection: Collection) => Promise<void>;
  onRestore: (collection: Collection) => Promise<void>;
  onEdit: () => void;
  onTrash: () => void;
  renameRequested: boolean;
  onRenameComplete: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [renaming, setRenaming] = useState(renameRequested);
  const [name, setName] = useState(item.name);
  useEffect(() => {
    if (renameRequested) setRenaming(true);
  }, [renameRequested]);
  useEffect(() => setName(item.name), [item.name]);
  const finishRename = async (): Promise<void> => {
    const nextName = name.trim();
    if (nextName && nextName !== item.name)
      await onSave({ ...item, name: nextName, updatedAt: Date.now() });
    setRenaming(false);
    onRenameComplete();
  };
  if (layout === 'list')
    return (
      <SessionListEditor
        item={item}
        collapsed={collapsed}
        onToggle={onToggle}
        onSave={onSave}
        onRestore={onRestore}
        onEdit={onEdit}
        onTrash={onTrash}
        renameRequested={renameRequested}
        onRenameComplete={onRenameComplete}
        onDragStart={onDragStart}
        onDrop={onDrop}
      />
    );
  return (
    <section
      class="collection-group"
      draggable
      onDragStart={(event) => {
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', item.id);
        }
        onDragStart();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <header class="collection-header" onClick={onToggle}>
        <div>
          <button class="collection-chevron" aria-label={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '›' : '⌄'}
          </button>
          {renaming ? (
            <input
              class="collection-name-input"
              autoFocus
              value={name}
              onClick={(event) => event.stopPropagation()}
              onInput={(event) => setName(event.currentTarget.value)}
              onBlur={() => void finishRename()}
              onKeyDown={(event) => event.key === 'Enter' && void finishRename()}
            />
          ) : (
            <button
              class="collection-name"
              title="Rename collection"
              onClick={(event) => {
                event.stopPropagation();
                setRenaming(true);
              }}
            >
              {item.name}
            </button>
          )}
          <small>{item.tabs.length} tabs</small>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <button
            title={item.pinned ? 'Unpin collection' : 'Pin collection'}
            onClick={() => void onSave({ ...item, pinned: !item.pinned, updatedAt: Date.now() })}
          >
            {item.pinned ? 'Pinned' : 'Pin'}
          </button>
          <button
            title={item.starred ? 'Remove star' : 'Star collection'}
            onClick={() => void onSave({ ...item, starred: !item.starred, updatedAt: Date.now() })}
          >
            {item.starred ? 'Starred' : 'Star'}
          </button>
          <button onClick={() => void onRestore(item)}>Restore</button>
          <button onClick={onEdit}>Edit</button>
          <button class="danger" onClick={onTrash}>
            Trash
          </button>
        </div>
      </header>
      {!collapsed && (
        <div class={layout === 'cards' ? 'saved-tab-cards' : 'saved-tab-compact'}>
          {item.tabs.length === 0 ? (
            <p class="empty-collection">This collection has no saved tabs.</p>
          ) : (
            item.tabs.map((tab) => (
              <a class="saved-tab-tile" href={tab.url} target="_blank" rel="noreferrer">
                <span class="tab-favicon">
                  {tab.faviconUrl ? <img src={tab.faviconUrl} alt="" /> : tab.title.slice(0, 1)}
                </span>
                <span>
                  <strong>{tab.title}</strong>
                  <small>{tab.url}</small>
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function SessionListEditor({
  item,
  collapsed,
  onToggle,
  onSave,
  onRestore,
  onEdit,
  onTrash,
  renameRequested,
  onRenameComplete,
  onDragStart,
  onDrop,
}: {
  item: Collection;
  collapsed: boolean;
  onToggle: () => void;
  onSave: (collection: Collection) => Promise<void>;
  onRestore: (collection: Collection) => Promise<void>;
  onEdit: () => void;
  onTrash: () => void;
  renameRequested: boolean;
  onRenameComplete: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [tabs, setTabs] = useState(item.tabs);
  const [dirty, setDirty] = useState(false);
  const [renaming, setRenaming] = useState(renameRequested);
  const [name, setName] = useState(item.name);
  useEffect(() => setTabs(item.tabs), [item]);
  useEffect(() => {
    if (renameRequested) setRenaming(true);
  }, [renameRequested]);
  useEffect(() => setName(item.name), [item.name]);
  const finishRename = async (): Promise<void> => {
    const nextName = name.trim();
    if (nextName && nextName !== item.name)
      await onSave({ ...item, name: nextName, updatedAt: Date.now() });
    setRenaming(false);
    onRenameComplete();
  };
  const changeTab = (id: string, change: { title?: string; url?: string }): void => {
    setTabs((current) => updateSavedTab({ ...item, tabs: current }, id, change).tabs);
    setDirty(true);
  };
  const save = async (): Promise<void> => {
    for (const tab of tabs) {
      try {
        new URL(tab.url);
      } catch {
        alert(`Enter a complete valid URL for “${tab.title || 'Untitled tab'}”.`);
        return;
      }
    }
    await onSave({
      ...item,
      tabs: tabs.map((tab, order) => ({ ...tab, order })),
      updatedAt: Date.now(),
    });
    setDirty(false);
  };
  return (
    <article
      class="session-list-group"
      draggable
      onDragStart={(event) => {
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', item.id);
        }
        onDragStart();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <header onClick={onToggle}>
        <div>
          <button class="collection-chevron" aria-label={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '›' : '⌄'}
          </button>
          {renaming ? (
            <input
              class="collection-name-input"
              autoFocus
              value={name}
              onClick={(event) => event.stopPropagation()}
              onInput={(event) => setName(event.currentTarget.value)}
              onBlur={() => void finishRename()}
              onKeyDown={(event) => event.key === 'Enter' && void finishRename()}
            />
          ) : (
            <button
              class="collection-name"
              title="Rename collection"
              onClick={(event) => {
                event.stopPropagation();
                setRenaming(true);
              }}
            >
              {item.name}
            </button>
          )}
          <small>{tabs.length} tabs</small>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <button
            onClick={() => void onSave({ ...item, pinned: !item.pinned, updatedAt: Date.now() })}
          >
            {item.pinned ? 'Pinned' : 'Pin'}
          </button>
          <button
            onClick={() => void onSave({ ...item, starred: !item.starred, updatedAt: Date.now() })}
          >
            {item.starred ? 'Starred' : 'Star'}
          </button>
          {dirty && <button onClick={() => void save()}>Save changes</button>}
          <button onClick={() => void onRestore(item)}>Restore</button>
          <button onClick={onEdit}>Edit</button>
          <button class="danger" onClick={onTrash}>
            Trash
          </button>
        </div>
      </header>
      {!collapsed &&
        tabs.map((tab) => (
          <div class="editable-tab-row">
            <span class="tab-favicon">
              {tab.faviconUrl ? <img src={tab.faviconUrl} alt="" /> : tab.title.slice(0, 1)}
            </span>
            <input
              aria-label="Tab title"
              value={tab.title}
              onInput={(event) => changeTab(tab.id, { title: event.currentTarget.value })}
            />
            <input
              type="url"
              aria-label="Tab URL"
              value={tab.url}
              onInput={(event) => changeTab(tab.id, { url: event.currentTarget.value })}
            />
            <button
              class="tab-open"
              aria-label={`Open ${tab.title}`}
              title="Open this tab"
              onClick={() => void send({ type: 'open-url', url: tab.url })}
            >
              Open
            </button>
            <button
              class="tab-delete"
              aria-label={`Delete ${tab.title}`}
              onClick={() => {
                setTabs((current) => removeSavedTab({ ...item, tabs: current }, tab.id).tabs);
                setDirty(true);
              }}
            >
              ×
            </button>
          </div>
        ))}
    </article>
  );
}

function Links({
  library,
  workspaceId,
  onEdit,
  onTrash,
}: {
  library: LibraryState;
  workspaceId: string;
  onEdit: (target: EditorTarget) => void;
  onTrash: (kind: EntityKind, id: string) => Promise<void>;
}) {
  const links = active(library.links.filter((item) => item.workspaceId === workspaceId));
  return (
    <>
      <PageHeading eyebrow="Reference library" title="Saved links">
        <button class="button primary" onClick={() => onEdit({ kind: 'link' })}>
          ＋ Save link
        </button>
      </PageHeading>
      {links.length === 0 ? (
        <Empty
          title="No links saved"
          copy="Save important pages without keeping another tab open."
        />
      ) : (
        <div class="list-card">
          {links.map((item) => (
            <article class="link-row">
              <span class="site-icon">{new URL(item.url).hostname.slice(0, 1).toUpperCase()}</span>
              <div>
                <h3>{item.name}</h3>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.url}
                </a>
                <p>{item.description}</p>
                <div class="tags">
                  {item.tags.map((tag) => (
                    <span>#{tag}</span>
                  ))}
                </div>
              </div>
              <div class="row-actions">
                <button onClick={() => onEdit({ kind: 'link', id: item.id })}>Edit</button>
                <button class="danger" onClick={() => void onTrash('link', item.id)}>
                  Trash
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Notes({
  library,
  workspaceId,
  onEdit,
  onTrash,
}: {
  library: LibraryState;
  workspaceId: string;
  onEdit: (target: EditorTarget) => void;
  onTrash: (kind: EntityKind, id: string) => Promise<void>;
}) {
  const notes = active(library.notes.filter((item) => item.workspaceId === workspaceId));
  return (
    <>
      <PageHeading eyebrow="Connected thinking" title="Notes">
        <button class="button primary" onClick={() => onEdit({ kind: 'note' })}>
          ＋ New note
        </button>
      </PageHeading>
      {notes.length === 0 ? (
        <Empty
          title="No notes yet"
          copy="Create a note and connect it to another with [[Note title]]."
        />
      ) : (
        <div class="notes-grid">
          {notes.map((item) => {
            const outgoing = extractWikiLinks(item.body);
            const backlinks = noteBacklinks(library, item.name);
            return (
              <article class="note-card">
                <div class="card-top">
                  <span class="pill">Note</span>
                  <button class="icon-button" onClick={() => onEdit({ kind: 'note', id: item.id })}>
                    •••
                  </button>
                </div>
                <h3>{item.name}</h3>
                <p>{item.body.slice(0, 220) || 'Empty note'}</p>
                <div class="note-links">
                  {outgoing.length > 0 && <span>{outgoing.length} outgoing</span>}
                  {backlinks.length > 0 && (
                    <span>
                      {backlinks.length} backlink{backlinks.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div class="tags">
                  {item.tags.map((tag) => (
                    <span>#{tag}</span>
                  ))}
                </div>
                <footer>
                  <small>Updated {timeLabel(item.updatedAt)}</small>
                  <button class="text-button danger" onClick={() => void onTrash('note', item.id)}>
                    Trash
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function LiveTabs({
  tabs,
  collapsedWindowKeys,
  onCollapsedChange,
  onRefresh,
  onCapture,
}: {
  tabs: LiveTab[];
  collapsedWindowKeys: string[];
  onCollapsedChange: (keys: string[]) => void;
  onRefresh: () => Promise<void>;
  onCapture: () => Promise<void>;
}) {
  const windows = groupLiveTabs(tabs);
  const collapsed = new Set(collapsedWindowKeys);
  const toggleWindow = (key: string): void => {
    onCollapsedChange(
      collapsed.has(key)
        ? collapsedWindowKeys.filter((item) => item !== key)
        : [...collapsedWindowKeys, key],
    );
  };
  const setAllCollapsed = (value: boolean): void =>
    onCollapsedChange(setCollapsedWindowKeys(collapsedWindowKeys, windows, value));
  return (
    <>
      <PageHeading eyebrow="Current browser state" title="Open windows">
        <button class="button ghost" onClick={() => void onRefresh()}>
          Refresh
        </button>
        <button class="button primary" onClick={() => void onCapture()}>
          Save current window
        </button>
      </PageHeading>
      <p class="window-summary">
        {windows.length} {windows.length === 1 ? 'window' : 'windows'} · {tabs.length} open tabs
      </p>
      {windows.length > 0 && (
        <div class="window-controls">
          <button onClick={() => setAllCollapsed(false)}>Expand all</button>
          <button onClick={() => setAllCollapsed(true)}>Collapse all</button>
        </div>
      )}
      {tabs.length === 0 && (
        <Empty title="No open tabs found" copy="Open a browser tab, then refresh this view." />
      )}
      {windows.map((windowGroup, index) => {
        const isCollapsed = collapsed.has(windowGroup.key);
        const panelId = `live-window-${windowGroup.key.replace(/[^a-z0-9-]/gi, '-')}`;
        return (
          <section class={`window-card${isCollapsed ? ' collapsed' : ''}`}>
            <button
              class="window-title"
              aria-expanded={!isCollapsed}
              aria-controls={panelId}
              onClick={() => toggleWindow(windowGroup.key)}
            >
              <div>
                <span class="window-chevron" aria-hidden="true">
                  {isCollapsed ? '›' : '⌄'}
                </span>
                <h2>Window {index + 1}</h2>
              </div>
              <span>{windowGroup.tabs.length} tabs</span>
            </button>
            {!isCollapsed && (
              <div id={panelId}>
                {windowGroup.tabs.map((tab) => (
                  <button
                    class="live-tab"
                    onClick={() => {
                      if (tab.id !== undefined) void browser.tabs.update(tab.id, { active: true });
                      if (tab.windowId !== undefined)
                        void browser.windows.update(tab.windowId, { focused: true });
                    }}
                  >
                    <span>{tab.favIconUrl ? <img src={tab.favIconUrl} alt="" /> : '□'}</span>
                    <div>
                      <strong>{tab.title}</strong>
                      <small>{tab.url}</small>
                    </div>
                    {tab.pinned && <em>Pinned</em>}
                    {tab.active && <i>Active</i>}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

function Trash({
  library,
  onRestore,
  onPurge,
}: {
  library: LibraryState;
  onRestore: (kind: EntityKind, id: string) => Promise<void>;
  onPurge: () => void;
}) {
  const entries: { kind: EntityKind; item: BaseEntity }[] = [
    ...library.workspaces
      .filter((item) => item.trashedAt)
      .map((item) => ({ kind: 'workspace' as const, item })),
    ...library.folders
      .filter((item) => item.trashedAt)
      .map((item) => ({ kind: 'folder' as const, item })),
    ...library.collections
      .filter((item) => item.trashedAt)
      .map((item) => ({ kind: 'collection' as const, item })),
    ...library.links
      .filter((item) => item.trashedAt)
      .map((item) => ({ kind: 'link' as const, item })),
    ...library.notes
      .filter((item) => item.trashedAt)
      .map((item) => ({ kind: 'note' as const, item })),
  ];
  return (
    <>
      <PageHeading eyebrow="Soft-deleted content" title="Recycle bin">
        {entries.length > 0 && (
          <button class="button danger-button" onClick={onPurge}>
            Empty recycle bin
          </button>
        )}
      </PageHeading>
      {entries.length === 0 ? (
        <Empty
          title="The recycle bin is empty"
          copy="Deleted items remain recoverable here until you permanently remove them."
        />
      ) : (
        <div class="list-card">
          {entries.map(({ kind, item }) => (
            <article class="trash-row">
              <span class="result-kind">{kind}</span>
              <div>
                <h3>{item.name}</h3>
                <small>Deleted {timeLabel(item.trashedAt)}</small>
              </div>
              <button class="button ghost" onClick={() => void onRestore(kind, item.id)}>
                Restore
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function SettingsView({
  settings,
  onChange,
  onExport,
  onExportFolders,
  onImport,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onExport: () => void;
  onExportFolders: () => void;
  onImport: () => void;
}) {
  const [syncConfig, setSyncConfig] = useState<CloudSyncPublicConfig | null>(null);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncUsername, setSyncUsername] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  useEffect(() => {
    void send({ type: 'get-cloud-sync-config' }).then((response) => {
      if (!response.ok || !response.syncConfig) return;
      setSyncConfig(response.syncConfig);
      setSyncUrl(response.syncConfig.url);
      setSyncUsername(response.syncConfig.username);
    });
  }, []);

  const saveSync = async (enabled: boolean): Promise<void> => {
    try {
      const url = new URL(syncUrl);
      if (url.protocol !== 'https:') throw new Error('Use an HTTPS WebDAV URL.');
      const granted = await browser.permissions.request({ origins: [`${url.origin}/*`] });
      if (!granted) throw new Error('Tabitha needs permission to reach that WebDAV server.');
      const response = await send({
        type: 'save-cloud-sync-config',
        config: {
          enabled,
          url: syncUrl,
          username: syncUsername,
          ...(syncPassword ? { password: syncPassword } : {}),
        },
      });
      if (!response.ok) throw new Error(response.error);
      setSyncConfig(response.syncConfig ?? null);
      setSyncPassword('');
      if (enabled) {
        const synced = await send({ type: 'sync-cloud', direction: 'auto' });
        if (!synced.ok) throw new Error(synced.error);
        setSyncStatus(synced.message ?? 'Automatic sync enabled and checked.');
        const refreshed = await send({ type: 'get-cloud-sync-config' });
        if (refreshed.ok && refreshed.syncConfig) setSyncConfig(refreshed.syncConfig);
      } else setSyncStatus('Cloud settings saved.');
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Cloud settings could not be saved.');
    }
  };

  const runSync = async (direction: 'auto' | 'upload' | 'download'): Promise<void> => {
    const response = await send({ type: 'sync-cloud', direction });
    setSyncStatus(response.ok ? (response.message ?? 'Sync complete.') : response.error);
    const refreshed = await send({ type: 'get-cloud-sync-config' });
    if (refreshed.ok && refreshed.syncConfig) setSyncConfig(refreshed.syncConfig);
  };
  return (
    <>
      <PageHeading eyebrow="Preferences and privacy" title="Settings" />
      <div class="settings-grid">
        <section class="settings-card">
          <h2>Appearance</h2>
          <p>Make the library comfortable for your screen and workflow.</p>
          <label>
            Theme
            <select
              value={settings.theme}
              onChange={(event) => update('theme', event.currentTarget.value as Settings['theme'])}
            >
              <option value="system">Follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Density
            <select
              value={settings.density}
              onChange={(event) =>
                update('density', event.currentTarget.value as Settings['density'])
              }
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            Accent color
            <input
              type="color"
              value={settings.accent}
              onInput={(event) => update('accent', event.currentTarget.value)}
            />
          </label>
        </section>
        <section class="settings-card">
          <h2>Collection restore</h2>
          <p>Control how saved browser windows are reopened.</p>
          <Toggle
            label="Confirm before restoring"
            checked={settings.confirmBeforeRestore}
            onChange={(value) => update('confirmBeforeRestore', value)}
          />
          <Toggle
            label="Skip tabs that are already open"
            checked={settings.deduplicateOnRestore}
            onChange={(value) => update('deduplicateOnRestore', value)}
          />
          <Toggle
            label="Restore into a new window"
            checked={settings.restoreInNewWindow}
            onChange={(value) => update('restoreInNewWindow', value)}
          />
          <Toggle
            label="Open dashboard when a new tab is created"
            checked={settings.openDashboardOnNewTab}
            onChange={(value) => update('openDashboardOnNewTab', value)}
          />
          {!settings.showWelcomeBanner && (
            <button class="text-button" onClick={() => update('showWelcomeBanner', true)}>
              Show the welcome banner again
            </button>
          )}
        </section>
        <section class="settings-card">
          <h2>Recovery snapshots</h2>
          <p>When enabled, Tabitha replaces one automatic snapshot on the selected interval.</p>
          <Toggle
            label="Enable automatic recovery"
            checked={settings.automaticSnapshots}
            onChange={(value) => update('automaticSnapshots', value)}
          />
          <label>
            Interval
            <select
              value={settings.snapshotIntervalMinutes}
              onChange={(event) =>
                update('snapshotIntervalMinutes', Number(event.currentTarget.value))
              }
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </label>
        </section>
        <section class="settings-card">
          <h2>Backup and portability</h2>
          <p>
            Export the complete library or download one restorable JSON file per folder. Protected
            folder files keep their contents encrypted.
          </p>
          <p class="backup-warning">
            <strong>Updating an unpacked copy?</strong> Export JSON first. Removing the old
            extension or loading the replacement from a different folder can give it a new browser
            ID, and the new copy cannot read the old copy's local storage.
          </p>
          <div class="button-row">
            <button class="button primary" onClick={onExport}>
              Export complete library
            </button>
            <button class="button ghost" onClick={onExportFolders}>
              Export separate folder files
            </button>
            <button class="button ghost" onClick={onImport}>
              Import library or folder
            </button>
          </div>
          <small>No library data is transmitted by these actions.</small>
        </section>
        <section class="settings-card wide">
          <h2>Cross-browser cloud sync</h2>
          <p>
            Use an HTTPS WebDAV file to keep the newest library available across browsers and
            devices. Automatic sync checks every five minutes while the browser is running.
          </p>
          <div class="sync-fields">
            <label>
              WebDAV file URL
              <input
                type="url"
                value={syncUrl}
                onInput={(event) => setSyncUrl(event.currentTarget.value)}
                placeholder="https://cloud.example.com/remote.php/dav/files/name/tabitha.json"
              />
            </label>
            <label>
              Username
              <input
                value={syncUsername}
                onInput={(event) => setSyncUsername(event.currentTarget.value)}
                autocomplete="username"
              />
            </label>
            <label>
              App password
              <input
                type="password"
                value={syncPassword}
                onInput={(event) => setSyncPassword(event.currentTarget.value)}
                placeholder={syncConfig?.hasPassword ? 'Saved; leave blank to keep it' : ''}
                autocomplete="current-password"
              />
            </label>
          </div>
          <div class="button-row">
            <button class="button primary" onClick={() => void saveSync(true)}>
              Save and enable
            </button>
            <button class="button ghost" onClick={() => void saveSync(false)}>
              Save without auto-sync
            </button>
            <button class="button ghost" onClick={() => void runSync('upload')}>
              Upload now
            </button>
            <button
              class="button ghost"
              onClick={() =>
                confirm('Replace this browser library with the WebDAV backup?') &&
                void runSync('download')
              }
            >
              Download now
            </button>
          </div>
          <small>
            Credentials stay in this browser and are excluded from exports and cloud backups.
            {syncConfig?.lastSyncedAt ? ` Last synced ${timeLabel(syncConfig.lastSyncedAt)}.` : ''}
          </small>
          {(syncStatus || syncConfig?.lastError) && (
            <p class="sync-status" role="status">
              {syncStatus || syncConfig?.lastError}
            </p>
          )}
        </section>
        <section class="settings-card wide">
          <h2>Privacy</h2>
          <div class="privacy-banner">
            <span>✓</span>
            <div>
              <strong>Local-first by design</strong>
              <p>
                Tabitha Workspaces has no analytics, account, server, advertising, or remote code.
                Your tabs, links, and notes remain in browser extension storage unless you
                explicitly export them or enable WebDAV sync to a server you choose.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label class="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <i />
    </label>
  );
}

function EditorDialog({
  target,
  library,
  workspaceId,
  selectedFolderId,
  onClose,
  onSave,
  onTrash,
}: {
  target: EditorTarget;
  library: LibraryState;
  workspaceId: string;
  selectedFolderId: string;
  onClose: () => void;
  onSave: (
    state: LibraryState,
    entity: Workspace | Folder | Collection | SavedLink | Note,
  ) => Promise<void>;
  onTrash: (kind: EntityKind, id: string) => Promise<void>;
}) {
  const plural = target.kind === 'link' ? 'links' : (`${target.kind}s` as keyof LibraryState);
  const existing = target.id
    ? (library[plural] as BaseEntity[]).find((item) => item.id === target.id)
    : undefined;
  const typedExisting = existing as Workspace | Folder | Collection | SavedLink | Note | undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(
    'description' in (typedExisting ?? {})
      ? String((typedExisting as Folder | Workspace | Collection | SavedLink).description)
      : '',
  );
  const [url, setUrl] = useState(
    target.kind === 'link' && typedExisting ? (typedExisting as SavedLink).url : 'https://',
  );
  const [body, setBody] = useState(
    target.kind === 'note' && typedExisting ? (typedExisting as Note).body : '',
  );
  const [tags, setTags] = useState(
    'tags' in (typedExisting ?? {})
      ? (typedExisting as Collection | SavedLink | Note).tags.join(', ')
      : '',
  );
  const [folderId, setFolderId] = useState(
    target.kind === 'workspace' && typedExisting
      ? (typedExisting as Workspace).folderId
      : selectedFolderId ||
          library.workspaces.find((item) => item.id === workspaceId)?.folderId ||
          active(library.folders)[0]?.id ||
          '',
  );
  const [editorWorkspaceId, setEditorWorkspaceId] = useState(
    'workspaceId' in (typedExisting ?? {})
      ? String((typedExisting as Collection | SavedLink | Note).workspaceId)
      : workspaceId,
  );
  const [color, setColor] = useState(
    target.kind === 'workspace' && typedExisting
      ? (typedExisting as Workspace).color
      : library.settings.accent,
  );
  const [collectionTabs, setCollectionTabs] = useState(
    target.kind === 'collection' && typedExisting ? (typedExisting as Collection).tabs : [],
  );
  const folders = active(library.folders).filter((folder) => !folder.locked);

  const submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim()) return;
    if (target.kind === 'link') {
      try {
        new URL(url);
      } catch {
        alert('Enter a complete valid URL.');
        return;
      }
    }
    const now = Date.now();
    const common = {
      id: existing?.id ?? createId(),
      name: name.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      order: existing?.order ?? (library[plural] as BaseEntity[]).length,
    };
    let entity: Workspace | Folder | Collection | SavedLink | Note;
    if (target.kind === 'workspace') entity = { ...common, description, color, folderId };
    else if (target.kind === 'folder') entity = { ...common, description };
    else if (target.kind === 'collection')
      entity = {
        ...common,
        workspaceId: editorWorkspaceId,
        description,
        tags: normalizeTags(tags),
        tabs: collectionTabs.map((tab, order) => ({ ...tab, order })),
        automatic: (typedExisting as Collection | undefined)?.automatic ?? false,
        ...((typedExisting as Collection | undefined)?.lastOpenedAt
          ? { lastOpenedAt: (typedExisting as Collection).lastOpenedAt }
          : {}),
      };
    else if (target.kind === 'link')
      entity = {
        ...common,
        workspaceId: editorWorkspaceId,
        url,
        description,
        tags: normalizeTags(tags),
      };
    else
      entity = {
        ...common,
        workspaceId: editorWorkspaceId,
        body,
        tags: normalizeTags(tags),
      };
    const items = library[plural] as BaseEntity[];
    const nextItems = existing
      ? items.map((item) => (item.id === entity.id ? entity : item))
      : target.kind === 'workspace'
        ? insertWorkspaceNearTop(library.workspaces, entity as Workspace)
        : [...items, entity];
    await onSave({ ...library, [plural]: nextItems }, entity);
  };

  return (
    <div
      class="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form class="modal" onSubmit={(event) => void submit(event)}>
        <header>
          <div>
            <p>{existing ? 'Edit' : 'Create'}</p>
            <h2>{target.kind}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          Name
          <input
            autoFocus
            value={name}
            onInput={(event) => setName(event.currentTarget.value)}
            placeholder={`${target.kind} name`}
            required
          />
        </label>
        {target.kind === 'workspace' && (
          <>
            <label>
              Description
              <textarea
                value={description}
                onInput={(event) => setDescription(event.currentTarget.value)}
              />
            </label>
            <label>
              Color
              <input
                type="color"
                value={color}
                onInput={(event) => setColor(event.currentTarget.value)}
              />
            </label>
            <label>
              Folder
              <select value={folderId} onChange={(event) => setFolderId(event.currentTarget.value)}>
                {folders.map((folder) => (
                  <option value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {target.kind === 'folder' && (
          <label>
            Description
            <textarea
              value={description}
              onInput={(event) => setDescription(event.currentTarget.value)}
            />
          </label>
        )}
        {target.kind === 'link' && (
          <label>
            URL
            <input
              type="url"
              value={url}
              onInput={(event) => setUrl(event.currentTarget.value)}
              required
            />
          </label>
        )}
        {(target.kind === 'collection' || target.kind === 'link') && (
          <label>
            Description
            <textarea
              value={description}
              onInput={(event) => setDescription(event.currentTarget.value)}
            />
          </label>
        )}
        {target.kind === 'collection' && collectionTabs.length > 0 && (
          <div class="tab-editor">
            <strong>Saved tabs</strong>
            {collectionTabs.map((tab) => (
              <div>
                <span>{tab.title}</span>
                <small>{tab.url}</small>
                <button
                  type="button"
                  title={`Remove ${tab.title}`}
                  onClick={() =>
                    setCollectionTabs((tabs) => tabs.filter((item) => item.id !== tab.id))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {target.kind === 'note' && (
          <label>
            Note body
            <textarea
              class="note-editor"
              value={body}
              onInput={(event) => setBody(event.currentTarget.value)}
              placeholder="Connect notes using [[Another note title]]."
            />
          </label>
        )}
        {(target.kind === 'collection' || target.kind === 'link' || target.kind === 'note') && (
          <>
            <label>
              Workspace
              <select
                value={editorWorkspaceId}
                onChange={(event) => {
                  setEditorWorkspaceId(event.currentTarget.value);
                  setFolderId('');
                }}
              >
                {active(library.workspaces).map((item) => (
                  <option value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              Tags
              <input
                value={tags}
                onInput={(event) => setTags(event.currentTarget.value)}
                placeholder="research, reading, project"
              />
              <small>Separate tags with commas.</small>
            </label>
          </>
        )}
        <footer>
          {existing && (
            <button
              type="button"
              class="button danger-button modal-trash"
              onClick={() => {
                if (confirm(`Move “${existing.name}” to the recycle bin?`))
                  void onTrash(target.kind, existing.id);
              }}
            >
              Move to recycle bin
            </button>
          )}
          <button type="button" class="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button class="button primary" type="submit">
            Save {target.kind}
          </button>
        </footer>
      </form>
    </div>
  );
}
