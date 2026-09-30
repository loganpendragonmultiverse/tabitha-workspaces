import { useEffect, useState } from 'preact/hooks';
import {
  availableCollections,
  copyCollection,
  exportCollectionLinks,
  filterSavedTabs,
  type TabSort,
} from '../../src/domain/workspaceTools';
import type { LibraryState } from '../../src/domain/types';

export function WorkspaceTools({
  library,
  workspaceId,
  onApply,
  onRestore,
}: {
  library: LibraryState;
  workspaceId: string;
  onApply: (change: (state: LibraryState) => LibraryState) => Promise<void>;
  onRestore: (collectionId: string, tabIds: string[]) => Promise<string>;
}) {
  const [collectionId, setCollectionId] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<TabSort>('saved');
  const [selected, setSelected] = useState<string[]>([]);
  const [destination, setDestination] = useState(workspaceId);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setCollectionId('');
    setSelected([]);
    setQuery('');
    setDestination(workspaceId);
    setMessage('');
  }, [workspaceId]);
  const collections = availableCollections(library, workspaceId);
  const collection = collections.find((c) => c.id === collectionId);
  const rows = collection ? filterSavedTabs(collection.tabs, query, sort) : [];
  const ids = selected.filter((id) => collection?.tabs.some((t) => t.id === id));
  const destinations = library.workspaces.filter(
    (w) =>
      !w.trashedAt && library.folders.some((f) => f.id === w.folderId && !f.locked && !f.trashedAt),
  );
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The action could not be completed.');
    } finally {
      setBusy(false);
    }
  };
  const exportLinks = (format: 'markdown' | 'bookmarks') => {
    if (!collection) return;
    if (
      !confirm(
        'This export contains the selected titles and full URLs, including query strings. Keep the file private unless you have reviewed it.',
      )
    )
      return;
    try {
      const content = exportCollectionLinks(collection, ids.length ? ids : undefined, format);
      const url = URL.createObjectURL(
        new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'text/html' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tabitha-collection.' + (format === 'markdown' ? 'md' : 'html');
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Exported links. Notes, settings and sync credentials are excluded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    }
  };
  return (
    <details class="workspace-tools">
      <summary>Collection tools — find, select, copy and export tabs</summary>
      <p>
        Work on saved tabs without changing their stored order. Copies leave the original collection
        intact.
      </p>
      <label>
        Collection
        <select
          value={collectionId}
          onChange={(e) => {
            setCollectionId(e.currentTarget.value);
            setSelected([]);
            setQuery('');
            setMessage('');
          }}
        >
          <option value="">Choose a collection</option>
          {collections.map((c) => (
            <option value={c.id}>
              {c.name} ({c.tabs.length} tabs)
            </option>
          ))}
        </select>
      </label>
      {collection && (
        <>
          <div class="tool-fields">
            <label>
              Find titles, URLs or domains
              <input type="search" value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
            </label>
            <label>
              Display order
              <select value={sort} onChange={(e) => setSort(e.currentTarget.value as TabSort)}>
                <option value="saved">Saved order</option>
                <option value="title">Title</option>
                <option value="domain">Domain</option>
              </select>
            </label>
          </div>
          <div class="tool-actions">
            <button
              class="button ghost"
              onClick={() => setSelected([...new Set([...ids, ...rows.map((t) => t.id)])])}
            >
              Select matching
            </button>
            <button class="button ghost" onClick={() => setSelected([])}>
              Clear selection
            </button>
            <span>
              {ids.length} selected · {rows.length} matching
            </span>
          </div>
          <div class="tool-tab-list">
            {rows.map((t) => (
              <label class="tool-tab">
                <input
                  type="checkbox"
                  checked={ids.includes(t.id)}
                  onChange={(e) =>
                    setSelected(
                      e.currentTarget.checked ? [...ids, t.id] : ids.filter((id) => id !== t.id),
                    )
                  }
                />
                <span>
                  <strong>{t.title}</strong>
                  <small>{t.url}</small>
                </span>
              </label>
            ))}
            {!rows.length && <p>No matching tabs.</p>}
          </div>
          <label>
            Copy into workspace
            <select value={destination} onChange={(e) => setDestination(e.currentTarget.value)}>
              {destinations.map((w) => (
                <option value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <div class="tool-actions">
            <button
              class="button ghost"
              disabled={busy || !ids.length}
              onClick={() =>
                void run(async () => {
                  if (!confirm('Restore ' + ids.length + ' selected tabs?')) return;
                  setMessage(await onRestore(collection.id, ids));
                })
              }
            >
              Restore selected
            </button>
            <button
              class="button ghost"
              disabled={busy || !ids.length}
              onClick={() =>
                void run(async () => {
                  await onApply((s) =>
                    copyCollection(s, collection.id, destination, collection.updatedAt, ids),
                  );
                  setMessage('Created a new collection from the selection.');
                })
              }
            >
              Copy selected
            </button>
            <button
              class="button ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await onApply((s) =>
                    copyCollection(s, collection.id, destination, collection.updatedAt),
                  );
                  setMessage('Collection copied. The original is unchanged.');
                })
              }
            >
              Duplicate collection
            </button>
            <button class="button ghost" onClick={() => exportLinks('markdown')}>
              Export {ids.length ? 'selected' : 'all'} as Markdown
            </button>
            <button class="button ghost" onClick={() => exportLinks('bookmarks')}>
              Export {ids.length ? 'selected' : 'all'} as bookmarks
            </button>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
