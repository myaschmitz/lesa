import { randomUUID } from 'expo-crypto';

import { getDatabase } from './database';
import type { Book, NewBook } from '@/types/book';

const ALL_COLUMNS =
  'id, title, author, format, relativePath, coverRelativePath, lastPosition, sizeBytes, sourceName, addedAt, lastOpenedAt';

/** Inserts a new book, generating its id and `addedAt`, and returns the row. */
export async function insertBook(input: NewBook): Promise<Book> {
  const db = await getDatabase();
  const book: Book = {
    id: randomUUID(),
    title: input.title,
    author: input.author,
    format: input.format,
    relativePath: input.relativePath,
    coverRelativePath: null,
    lastPosition: null,
    sizeBytes: input.sizeBytes,
    sourceName: input.sourceName,
    addedAt: Date.now(),
    lastOpenedAt: null,
  };

  await db.runAsync(
    `INSERT INTO books (${ALL_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    book.id,
    book.title,
    book.author,
    book.format,
    book.relativePath,
    book.coverRelativePath,
    book.lastPosition,
    book.sizeBytes,
    book.sourceName,
    book.addedAt,
    book.lastOpenedAt,
  );

  return book;
}

/** All books, most recently added first. */
export async function getAllBooks(): Promise<Book[]> {
  const db = await getDatabase();
  return db.getAllAsync<Book>(`SELECT ${ALL_COLUMNS} FROM books ORDER BY addedAt DESC`);
}

export async function getBookById(id: string): Promise<Book | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Book>(`SELECT ${ALL_COLUMNS} FROM books WHERE id = ?`, id);
}

/** Finds a likely duplicate by original filename + byte size. */
export async function findDuplicate(sourceName: string, sizeBytes: number): Promise<Book | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Book>(
    `SELECT ${ALL_COLUMNS} FROM books WHERE sourceName = ? AND sizeBytes = ? LIMIT 1`,
    sourceName,
    sizeBytes,
  );
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM books WHERE id = ?', id);
}

export async function updateLastPosition(id: string, position: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE books SET lastPosition = ? WHERE id = ?', position, id);
}

export async function updateLastOpenedAt(id: string, timestamp: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE books SET lastOpenedAt = ? WHERE id = ?', timestamp, id);
}
