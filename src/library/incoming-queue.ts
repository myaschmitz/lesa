type IncomingBookListener = (uri: string) => void;

const pending: string[] = [];
let listener: IncomingBookListener | null = null;
let lastUri: string | null = null;
let lastAt = 0;

// iOS can deliver the same hand-off twice in quick succession (e.g. cold-start
// initial URL plus a follow-up event). Collapse exact repeats inside this window
// so a single share doesn't trigger two imports.
const DEDUPE_WINDOW_MS = 3000;

/**
 * Records a book file URL handed to the app via the share sheet / "Open in
 * Lesa". Delivered immediately if a listener is attached, otherwise buffered
 * until one is (cold start, before React has mounted).
 */
export function enqueueIncomingBook(uri: string): void {
  const now = Date.now();
  if (uri === lastUri && now - lastAt < DEDUPE_WINDOW_MS) return;
  lastUri = uri;
  lastAt = now;

  if (listener) listener(uri);
  else pending.push(uri);
}

/**
 * Attaches the single consumer for inbound book URLs and drains any backlog
 * buffered before it arrived. Returns a cleanup function that detaches it.
 */
export function setIncomingBookListener(fn: IncomingBookListener): () => void {
  listener = fn;
  if (pending.length > 0) {
    const backlog = pending.splice(0, pending.length);
    for (const uri of backlog) fn(uri);
  }
  return () => {
    if (listener === fn) listener = null;
  };
}
