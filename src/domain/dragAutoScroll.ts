const EDGE_ZONE = 96;
const MAX_STEP = 28;

/** Return a bounded vertical scroll step while a drag is near a viewport edge. */
export const dragAutoScrollDelta = (pointerY: number, viewportHeight: number): number => {
  if (viewportHeight <= 0) return 0;
  if (pointerY < EDGE_ZONE)
    return -Math.ceil(((EDGE_ZONE - Math.max(0, pointerY)) / EDGE_ZONE) * MAX_STEP);
  if (pointerY > viewportHeight - EDGE_ZONE)
    return Math.ceil(
      ((Math.min(viewportHeight, pointerY) - (viewportHeight - EDGE_ZONE)) / EDGE_ZONE) * MAX_STEP,
    );
  return 0;
};
