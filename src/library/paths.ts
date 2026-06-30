import { Directory, File, Paths } from 'expo-file-system';

/** Subdirectory of the app's Documents directory where book files live. */
export const BOOKS_DIR = 'books';

/** Subdirectory of the app's Documents directory where extracted covers live. */
export const COVERS_DIR = 'covers';

/** The `books/` directory inside the app's (non-purgeable) Documents directory. */
export function booksDirectory(): Directory {
  return new Directory(Paths.document, BOOKS_DIR);
}

/** Ensures `Paths.document/books/` exists. Safe to call repeatedly. */
export function ensureBooksDir(): Directory {
  const dir = booksDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Ensures `Paths.document/covers/` exists. Safe to call repeatedly. */
export function ensureCoversDir(): Directory {
  const dir = new Directory(Paths.document, COVERS_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Rebuilds the absolute on-device URI for a stored RELATIVE path.
 *
 * Always derive absolute URIs this way at runtime — never persist them. The iOS
 * container UUID changes on every reinstall, so a stored absolute path would
 * break, while `Paths.document` always points at the current container.
 */
export function toAbsoluteUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

/** A `File` handle for a stored relative path. */
export function bookFile(relativePath: string): File {
  return new File(Paths.document, relativePath);
}

/** Whether the file backing a stored relative path currently exists on disk. */
export function bookFileExists(relativePath: string): boolean {
  return new File(Paths.document, relativePath).exists;
}

/** Deletes the file backing a stored relative path, if it still exists. */
export function deleteBookFile(relativePath: string): void {
  const file = new File(Paths.document, relativePath);
  if (file.exists) {
    file.delete();
  }
}

/** Deletes a book's cover image, if any. Safe when the path is null/missing. */
export function deleteCoverFile(coverRelativePath: string | null): void {
  if (!coverRelativePath) return;
  const file = new File(Paths.document, coverRelativePath);
  if (file.exists) {
    file.delete();
  }
}
