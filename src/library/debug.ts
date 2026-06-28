/**
 * Lightweight tagged logger for the import / share-sheet pipeline. Logs only in
 * development so we can trace inbound file hand-offs without shipping noise.
 */
export function importLog(...args: unknown[]): void {
  if (__DEV__) console.log('[Lesa import]', ...args);
}
