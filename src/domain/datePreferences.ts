import { formatSystemDateTime, formatPreferredDateTime } from './dateFormat';
import { availableCollections } from './workspaceTools';
import type { DateFormat, LibraryState } from './types';
export interface DateNameChange {
  id: string;
  before: string;
  after: string;
}
export const previewDateNames = (state: LibraryState, format: DateFormat): DateNameChange[] => {
  const visible = new Set(
    state.workspaces.flatMap((w) => availableCollections(state, w.id).map((c) => c.id)),
  );
  return state.collections
    .filter((c) => visible.has(c.id) && !c.automatic)
    .flatMap((c) => {
      const candidates = ['en-US', 'en-GB'].flatMap((locale) => [
        'Collection ' + formatSystemDateTime(c.createdAt, [locale]),
        'Collection ' + new Date(c.createdAt).toLocaleString(locale),
      ]);
      const after = 'Collection ' + formatPreferredDateTime(c.createdAt, format);
      return candidates.includes(c.name) && c.name !== after
        ? [{ id: c.id, before: c.name, after }]
        : [];
    });
};
export const applyDateNames = (
  state: LibraryState,
  changes: DateNameChange[],
  undo = false,
): LibraryState => {
  const current = previewDateNames(state, state.settings.dateFormat);
  const visible = new Set(
    state.workspaces.flatMap((w) => availableCollections(state, w.id).map((c) => c.id)),
  );
  if (changes.some((change) => !visible.has(change.id)))
    throw new Error('A collection is unavailable. Refresh the date-name preview.');
  return {
    ...state,
    collections: state.collections.map((c) => {
      const change = changes.find((x) => x.id === c.id);
      if (!change) return c;
      const expected = undo ? change.after : change.before;
      if (
        c.name !== expected ||
        (!undo &&
          !current.some(
            (x) => x.id === c.id && x.before === change.before && x.after === change.after,
          ))
      )
        throw new Error('A collection changed. Refresh the date-name preview.');
      return { ...c, name: undo ? change.before : change.after, updatedAt: Date.now() };
    }),
  };
};
