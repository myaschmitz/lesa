import { enqueueIncomingBook } from '@/library/incoming-queue';

// File extensions Lesa imports. Kept in sync with the document types declared in
// app.json (org.idpf.epub-container / com.adobe.pdf).
const BOOK_EXTENSIONS = ['.epub', '.pdf'];

function isFileUrl(path: string): boolean {
  return path.startsWith('file://');
}

function hasBookExtension(path: string): boolean {
  let candidate = path;
  try {
    candidate = decodeURIComponent(path);
  } catch {
    // Fall back to the raw path if it isn't valid percent-encoding.
  }
  const lower = candidate.toLowerCase();
  return BOOK_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Expo Router routes every inbound deep link — including the `file://` URLs iOS
 * delivers for "Open in Lesa" / share-sheet hand-offs — through this hook before
 * matching a screen. A file URL has no route, so without this it renders the
 * "unmatched route" screen.
 *
 * We intercept those file URLs, queue any supported book for import, and send
 * the navigator to the Library (`/`) instead of trying to route the file path.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (isFileUrl(path)) {
      if (hasBookExtension(path)) enqueueIncomingBook(path);
      // Never let a file hand-off fall through to the router; it has no route.
      return '/';
    }
  } catch {
    return '/';
  }
  return path;
}
