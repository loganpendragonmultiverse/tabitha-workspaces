import { useMemo, useState } from 'preact/hooks';
import { formatPreferredDateTime } from '../../src/domain/dateFormat';
import {
  applyDateNames,
  previewDateNames,
  type DateNameChange,
} from '../../src/domain/datePreferences';
import type { DateFormat, LibraryState } from '../../src/domain/types';
export function DatePreferences({
  library,
  onApply,
}: {
  library: LibraryState;
  onApply: (change: (s: LibraryState) => LibraryState) => Promise<void>;
}) {
  const [preview, setPreview] = useState<DateNameChange[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [undo, setUndo] = useState<DateNameChange[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const repairable = useMemo(
    () => previewDateNames(library, library.settings.dateFormat),
    [library],
  );
  const showRepair = repairable.length > 0 || preview.length > 0 || undo.length > 0;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Date settings could not be updated.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section class="workspace-tools">
      <h2>Date display</h2>
      <label>
        Date format
        <select
          disabled={busy}
          value={library.settings.dateFormat}
          onChange={(e) => {
            const format = e.currentTarget.value as DateFormat;
            void run(async () => {
              await onApply((s) => ({
                ...s,
                settings: { ...s.settings, dateFormat: format, dateFormatExplicit: true },
              }));
              setPreview([]);
              setSelected([]);
              setMessage(
                'Date preference saved. Existing names are retained. Repair options appear when older generated names need updating.',
              );
            });
          }}
        >
          <option value="system">Browser locale (default for new libraries)</option>
          <option value="day-first">Day / month / year</option>
          <option value="month-first">Month / day / year</option>
          <option value="iso">Year-month-day</option>
        </select>
      </label>
      <p>
        New libraries default to browser locale. Browser language may differ from computer region;
        choose an explicit format when needed. Existing saved formats are preserved. New captures
        use this format. Example:{' '}
        {formatPreferredDateTime(
          new Date(2026, 8, 27, 16, 5).getTime(),
          library.settings.dateFormat,
        )}
        .
      </p>
      {showRepair && (
        <details class="date-repair">
          <summary>Repair older generated date names</summary>
          <p>
            Older collection names are saved text. Preview recognized generated names before
            changing them; custom names and locked folders are excluded.
          </p>
          <button
            class="button ghost"
            disabled={busy}
            onClick={() => {
              const changes = previewDateNames(library, library.settings.dateFormat);
              setPreview(changes);
              setSelected(changes.map((c) => c.id));
              setMessage(
                changes.length
                  ? 'Review the names below.'
                  : 'No recognized date names need changing.',
              );
            }}
          >
            Preview old date names
          </button>
          {preview.length > 0 && (
            <>
              <div class="tool-tab-list">
                {preview.map((c) => (
                  <label class="tool-tab">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={(e) =>
                        setSelected(
                          e.currentTarget.checked
                            ? [...selected, c.id]
                            : selected.filter((id) => id !== c.id),
                        )
                      }
                    />
                    <span>
                      {c.before}
                      <small>→ {c.after}</small>
                    </span>
                  </label>
                ))}
              </div>
              <button
                class="button ghost"
                disabled={busy || !selected.length}
                onClick={() =>
                  void run(async () => {
                    const changes = preview.filter((c) => selected.includes(c.id));
                    await onApply((s) => applyDateNames(s, changes));
                    setUndo(changes);
                    setPreview([]);
                    setMessage('Updated ' + changes.length + ' collection names.');
                  })
                }
              >
                Apply reviewed names
              </button>
            </>
          )}
          {undo.length > 0 && (
            <button
              class="button ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await onApply((s) => applyDateNames(s, undo, true));
                  setUndo([]);
                  setMessage('Original names restored.');
                })
              }
            >
              Undo name changes
            </button>
          )}
        </details>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
