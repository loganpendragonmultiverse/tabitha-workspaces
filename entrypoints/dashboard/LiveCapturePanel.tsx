import { useState } from 'preact/hooks';
import type { LiveTab } from '../../src/browser/messages';
import type { Collection } from '../../src/domain/types';
import { filterLiveTabs } from '../../src/domain/liveCapture';
import { groupLiveTabs } from '../../src/domain/liveWindows';
import { TabFavicon } from './TabFavicon';

export function LiveCapturePanel({
  tabs,
  collections,
  onDrag,
  onSave,
  onClose,
  onRefresh,
}: {
  tabs: LiveTab[];
  collections: Collection[];
  onDrag: (ids: number[], skip: boolean) => void;
  onSave: (ids: number[], collection: string, skip: boolean) => Promise<void>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [target, setTarget] = useState('');
  const [skip, setSkip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const filtered = filterLiveTabs(tabs, query);
  const selectedIds = selected.filter((id) => tabs.some((tab) => tab.id === id));
  const windows = groupLiveTabs(filtered);
  return (
    <aside class="live-capture-panel" aria-label="Open windows capture panel">
      <header>
        <h2>Open windows</h2>
        <button onClick={onClose} aria-label="Close open windows panel">
          ×
        </button>
      </header>
      <p>Drag a tab or your selection straight onto a saved collection. Open tabs stay open.</p>
      <input
        aria-label="Search open tabs"
        placeholder="Search titles or URLs"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <div class="panel-actions">
        <button onClick={() => void onRefresh()}>Refresh</button>
        <button
          onClick={() =>
            setSelected(filtered.flatMap((tab) => (tab.id === undefined ? [] : [tab.id])))
          }
        >
          Select visible
        </button>
        <button onClick={() => setSelected([])}>Clear selection</button>
      </div>
      <label>
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.currentTarget.checked)} />{' '}
        Skip URLs already in the collection
      </label>
      <label>
        Keyboard capture destination
        <select
          aria-label="Capture destination"
          value={target}
          onChange={(e) => setTarget(e.currentTarget.value)}
        >
          <option value="">Choose collection</option>
          {collections.map((c) => (
            <option value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <button
        disabled={busy || !selectedIds.length || !target}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await onSave(selectedIds, target, skip);
            setSelected([]);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Capture failed.');
          } finally {
            setBusy(false);
          }
        }}
      >
        Save selected ({selectedIds.length})
      </button>
      {error && <p role="alert">{error}</p>}
      {!filtered.length && <p>No matching restorable tabs.</p>}
      {windows.map((window) => {
        const key = String(window.windowId ?? 'unknown');
        const isCollapsed = collapsed.includes(key);
        return (
          <section class="capture-window" key={key}>
            <button
              class="capture-window-heading"
              aria-expanded={!isCollapsed}
              onClick={() =>
                setCollapsed(
                  isCollapsed ? collapsed.filter((item) => item !== key) : [...collapsed, key],
                )
              }
            >
              <span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
              <strong>Window {window.windowId ?? 'unknown'}</strong>
              <small>{window.tabs.length} tabs</small>
            </button>
            {!isCollapsed && (
              <div class="capture-window-tabs">
                {window.tabs.map((tab) => {
                  if (tab.id === undefined) return null;
                  return (
                    <div
                      class="capture-tab"
                      draggable
                      title={tab.url}
                      onDragStart={(event) => {
                        const ids = selectedIds.includes(tab.id) ? selectedIds : [tab.id];
                        event.dataTransfer?.setData('application/x-tabitha-tab', 'live');
                        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
                        onDrag(ids, skip);
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={'Select open tab ' + tab.title}
                        checked={selectedIds.includes(tab.id)}
                        onChange={(e) =>
                          setSelected(
                            e.currentTarget.checked
                              ? [...selectedIds, tab.id]
                              : selectedIds.filter((id) => id !== tab.id),
                          )
                        }
                      />
                      <span class="capture-tab-favicon" aria-hidden="true">
                        <TabFavicon url={tab.url} icon={tab.favIconUrl} title={tab.title} />
                      </span>
                      <strong>{tab.title || 'Untitled tab'}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}
