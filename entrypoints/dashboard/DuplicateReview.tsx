import { useState } from 'preact/hooks';
import {
  applyDuplicateMerge,
  previewDuplicateMerge,
  reviewableCollections,
} from '../../src/domain/duplicateReview';
import type { DuplicatePreview, UrlReviewMode } from '../../src/domain/duplicateReview';
import type { LibraryState } from '../../src/domain/types';

export function DuplicateReview({
  library,
  onApply,
}: {
  library: LibraryState;
  onApply: (state: LibraryState) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<UrlReviewMode>('exact');
  const [preview, setPreview] = useState<DuplicatePreview | null>(null);
  const [name, setName] = useState('Reviewed merged collection');
  const [status, setStatus] = useState('');
  return (
    <section class="settings-card">
      <h2>Duplicate URL review</h2>
      <p>
        Select collections, inspect duplicate groups, then create a merged copy. Originals remain
        intact. Protected folders are excluded. The first occurrence supplies each retained tab’s
        title and flags.
      </p>
      <label>
        URL comparison{' '}
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.currentTarget.value as UrlReviewMode);
            setPreview(null);
          }}
        >
          <option value="exact">Exact URL text</option>
          <option value="normalized">Normalize host, scheme and default port</option>
          <option value="ignore-fragment">Normalize and ignore fragment (explicit)</option>
        </select>
      </label>
      <p>
        Query strings remain significant. Ignoring fragments can combine distinct application
        screens.
      </p>
      {reviewableCollections(library).map((c) => (
        <label key={c.id} style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={selected.includes(c.id)}
            onChange={(e) => {
              setSelected(
                e.currentTarget.checked
                  ? [...selected, c.id]
                  : selected.filter((id) => id !== c.id),
              );
              setPreview(null);
            }}
          />{' '}
          {c.name} ({c.tabs.length} tabs)
        </label>
      ))}
      <button
        class="button primary"
        onClick={() => {
          try {
            setPreview(previewDuplicateMerge(library, selected, mode));
            setStatus('Preview ready; review groups below.');
          } catch (e) {
            setStatus(e instanceof Error ? e.message : 'Preview failed');
          }
        }}
      >
        Preview duplicate merge
      </button>
      {preview && (
        <div>
          <p>
            {preview.sourceCount} source tabs → {preview.kept.length} retained tabs;{' '}
            {preview.groups.length} duplicate groups.
          </p>
          {preview.groups.map((group) => (
            <details key={group.url}>
              <summary style={{ overflowWrap: 'anywhere' }}>
                {group.occurrences.length} copies: {group.url}
              </summary>
              <ul>
                {group.occurrences.map((item, i) => (
                  <li key={i} style={{ overflowWrap: 'anywhere' }}>
                    {item.collection}: {item.title} — {item.url}
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <label>
            New collection name{' '}
            <input value={name} onInput={(e) => setName(e.currentTarget.value)} />
          </label>
          <button
            class="button primary"
            onClick={() => {
              void (async () => {
                try {
                  await onApply(applyDuplicateMerge(library, preview, name));
                  setPreview(null);
                  setSelected([]);
                  setStatus('Created the reviewed merged collection. Originals retained.');
                } catch (e) {
                  setStatus(e instanceof Error ? e.message : 'Merge failed');
                }
              })();
            }}
          >
            Create reviewed merged copy
          </button>
        </div>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
