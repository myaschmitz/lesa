export type BookFormat = 'epub' | 'pdf';

/**
 * A row in the book catalog.
 *
 * Storage rules (see docs/ARCHITECTURE.md):
 * - `relativePath` is ALWAYS relative to the app's Documents directory
 *   (e.g. `books/<uuid>.epub`). The absolute URI is rebuilt at runtime because
 *   the iOS container UUID changes on every reinstall.
 * - `lastPosition` is an opaque, per-format token (EPUB locator/CFI vs PDF
 *   page+offset). It is never interpreted outside the matching reader engine.
 * - Book content lives on the filesystem, never in this row.
 */
export interface Book {
  id: string;
  title: string;
  author: string | null;
  format: BookFormat;
  /** Relative to `Paths.document`, e.g. `books/<uuid>.epub`. Never absolute. */
  relativePath: string;
  /** Relative to `Paths.document`, e.g. `covers/<uuid>.jpg`. Null until covers land. */
  coverRelativePath: string | null;
  /** Opaque per-format position token. Null until a reader writes one. */
  lastPosition: string | null;
  /** Size of the source file in bytes; used for duplicate detection. */
  sizeBytes: number;
  /** Original filename of the imported file; used for duplicate detection. */
  sourceName: string;
  /** Epoch milliseconds when the book was imported. */
  addedAt: number;
  /** Epoch milliseconds when the book was last opened. Null until first open. */
  lastOpenedAt: number | null;
  /** Display-only reading progress, 0–1. Null until a reader reports one. Never the opaque position token. */
  progress: number | null;
}

/** Fields required to insert a new book; the rest are defaulted on import. */
export type NewBook = Pick<
  Book,
  'title' | 'author' | 'format' | 'relativePath' | 'sizeBytes' | 'sourceName'
>;
