import type { CollectionSortMode } from './types';

export type CaptureTabQuery = { currentWindow: true } | { windowId: number };

/** Keep explicit other-window captures separate from the current-window default. */
export const captureTabQuery = (windowId?: number): CaptureTabQuery =>
  windowId === undefined ? { currentWindow: true } : { windowId };

/** Manual captures must be visible first; recovery snapshots must not change a user's view. */
export const collectionSortAfterCapture = (
  current: Record<string, CollectionSortMode>,
  workspaceId: string,
  automatic: boolean,
): Record<string, CollectionSortMode> =>
  automatic ? current : { ...current, [workspaceId]: 'custom' };
