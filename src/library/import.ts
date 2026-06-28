import { randomUUID } from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { findDuplicate, insertBook } from '@/db/books';
import { ensureBooksDir } from '@/library/paths';
import type { Book, BookFormat } from '@/types/book';

const MIME_TYPES = ['application/pdf', 'application/epub+zip'];

/** A file the user picked (or that arrived via the share sheet), pre-import. */
export interface ImportCandidate {
  /** Temporary, readable URI of the source file. Never persisted. */
  uri: string;
  /** Original filename, e.g. `Moby Dick.epub`. */
  name: string;
  sizeBytes: number;
  format: BookFormat;
}

/** Infers the book format from a filename extension, falling back to a MIME type. */
export function inferFormat(name: string, mimeType?: string): BookFormat | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'epub') return 'epub';
  if (ext === 'pdf') return 'pdf';
  if (mimeType === 'application/epub+zip') return 'epub';
  if (mimeType === 'application/pdf') return 'pdf';
  return null;
}

/** Strips a trailing extension to use the filename as a display title. */
export function titleFromName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.trim() || name;
}

/** Opens the system document picker and returns supported candidates. */
export async function pickBooks(): Promise<ImportCandidate[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: MIME_TYPES,
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled) return [];

  const candidates: ImportCandidate[] = [];
  for (const asset of result.assets) {
    const format = inferFormat(asset.name, asset.mimeType);
    if (!format) continue;
    candidates.push({
      uri: asset.uri,
      name: asset.name,
      sizeBytes: asset.size ?? 0,
      format,
    });
  }
  return candidates;
}

/** Looks for an existing book that matches this candidate by filename + size. */
export function findDuplicateFor(candidate: ImportCandidate): Promise<Book | null> {
  return findDuplicate(candidate.name, candidate.sizeBytes);
}

/**
 * Copies a candidate's bytes into `Paths.document/books/` under a fresh,
 * collision-proof filename, then records a catalog row. Returns the new book.
 *
 * The picker/share URI is a temporary grant, so we copy immediately and only
 * ever persist the resulting RELATIVE path.
 */
export async function importCandidate(candidate: ImportCandidate): Promise<Book> {
  const dir = ensureBooksDir();
  const filename = `${randomUUID()}.${candidate.format}`;
  const destination = new File(dir, filename);

  const source = new File(candidate.uri);
  await source.copy(destination);

  const sizeBytes = candidate.sizeBytes || destination.size || 0;

  return insertBook({
    title: titleFromName(candidate.name),
    author: null,
    format: candidate.format,
    relativePath: `books/${filename}`,
    sizeBytes,
    sourceName: candidate.name,
  });
}
