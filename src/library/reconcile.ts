import { deleteBook, getAllBooks } from '@/db/books';
import { bookFileExists } from '@/library/paths';
import type { Book } from '@/types/book';

export interface ReconcileResult {
  /** Books whose backing file was found on disk. */
  present: Book[];
  /** Books pruned because their backing file was missing. */
  orphaned: Book[];
}

/**
 * Launch-time integrity pass for the catalog.
 *
 * Absolute URIs are always rebuilt from `Paths.document` + the stored relative
 * path, so an app update or reinstall (which changes the container UUID) never
 * orphans a book whose file still exists. Any row whose file is genuinely gone
 * is pruned so the Library never shows a book that can't be opened.
 */
export async function reconcileCatalog(): Promise<ReconcileResult> {
  const books = await getAllBooks();
  const present: Book[] = [];
  const orphaned: Book[] = [];

  for (const book of books) {
    if (bookFileExists(book.relativePath)) {
      present.push(book);
    } else {
      orphaned.push(book);
    }
  }

  for (const book of orphaned) {
    await deleteBook(book.id);
  }

  return { present, orphaned };
}
