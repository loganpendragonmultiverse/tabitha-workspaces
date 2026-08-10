import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import type { BackgroundRequest, BackgroundResponse } from '../../src/browser/messages';
import type { Collection, LibraryState } from '../../src/domain/types';
import { getLibrary, updateLibrary } from '../../src/storage/libraryStore';
import './styles.css';

const send = (request: BackgroundRequest): Promise<BackgroundResponse> =>
  browser.runtime.sendMessage(request);

function Popup() {
  const [library, setLibrary] = useState<LibraryState | null>(null);
  const [message, setMessage] = useState('');
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  useEffect(() => {
    void getLibrary().then(setLibrary);
  }, []);
  const workspace =
    library?.workspaces.find(
      (item) => item.id === library.settings.selectedWorkspaceId && !item.trashedAt,
    ) ?? library?.workspaces.find((item) => !item.trashedAt);
  const recent =
    library?.collections
      .filter((item) => !item.trashedAt && !item.automatic)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3) ?? [];

  const run = async (request: BackgroundRequest, success: string): Promise<void> => {
    const response = await send(request);
    setMessage(response.ok ? (response.message ?? success) : response.error);
    if (response.ok && request.type !== 'restore-collection') setLibrary(await getLibrary());
  };
  const restore = (item: Collection) =>
    run({ type: 'restore-collection', collectionId: item.id }, 'Restored.');

  const saveRename = async (item: Collection): Promise<void> => {
    const name = renameValue.trim();
    if (!name) return;
    const next = await updateLibrary((state) => ({
      ...state,
      collections: state.collections.map((collection) =>
        collection.id === item.id ? { ...collection, name, updatedAt: Date.now() } : collection,
      ),
    }));
    setLibrary(next);
    setRenamingId('');
    setMessage('Collection renamed.');
  };

  return (
    <main>
      <header>
        <span>T</span>
        <div>
          <strong>Tabitha</strong>
          <small>{workspace?.name ?? 'Workspaces'}</small>
        </div>
        <button onClick={() => void send({ type: 'open-dashboard', route: 'settings' })}>⚙</button>
      </header>
      <section class="quick">
        <button
          onClick={() =>
            void run(
              { type: 'capture-window', ...(workspace ? { workspaceId: workspace.id } : {}) },
              'Window saved.',
            )
          }
        >
          <i>▣</i>
          <strong>Save window</strong>
          <small>Capture every tab</small>
        </button>
        <button
          onClick={() =>
            void run(
              { type: 'capture-active-link', ...(workspace ? { workspaceId: workspace.id } : {}) },
              'Page saved.',
            )
          }
        >
          <i>↗</i>
          <strong>Save page</strong>
          <small>Add active tab</small>
        </button>
      </section>
      <div class="title">
        <strong>Recent collections</strong>
        <button onClick={() => void send({ type: 'open-dashboard', route: 'overview' })}>
          View all
        </button>
      </div>
      <section class="recent">
        {recent.length === 0 ? (
          <p>No collections yet.</p>
        ) : (
          recent.map((item) => (
            <div class="recent-item">
              {renamingId === item.id ? (
                <form
                  class="rename-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveRename(item);
                  }}
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onInput={(event) => setRenameValue(event.currentTarget.value)}
                    aria-label={`Rename ${item.name}`}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setRenamingId('')}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button class="recent-open" onClick={() => void restore(item)}>
                    <span>{item.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.tabs.length} tabs</small>
                    </div>
                    <i>↗</i>
                  </button>
                  <button
                    class="recent-rename"
                    onClick={() => {
                      setRenamingId(item.id);
                      setRenameValue(item.name);
                    }}
                    aria-label={`Rename ${item.name}`}
                  >
                    Rename
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </section>
      <button class="open" onClick={() => void send({ type: 'open-dashboard' })}>
        Open workspace dashboard <span>→</span>
      </button>
      {message && <p class="message">{message}</p>}
    </main>
  );
}

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Tabitha popup root was not found.');
render(<Popup />, root);
