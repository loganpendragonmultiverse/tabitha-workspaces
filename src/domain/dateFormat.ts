/** Format saved dates consistently for Tabitha's UK-facing interface. */
export const formatUkDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-GB');
