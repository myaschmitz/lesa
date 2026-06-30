import { randomUUID } from 'expo-crypto';

import { getDatabase } from './database';
import type { Highlight, HighlightColorKey, NewHighlight } from '@/types/highlight';

const ALL_COLUMNS = 'id, bookId, anchor, color, text, note, createdAt, updatedAt';

/**
 * Upper bound on the stored selected-text snapshot. The snapshot exists only so
 * the highlights list is readable — it is never the source of truth — so we cap
 * it to keep the DB lean and avoid stashing large content (golden rule #3).
 */
const MAX_SNAPSHOT_LENGTH = 500;

/** Trims and caps a selected-text snapshot for storage/display. */
function boundSnapshot(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_SNAPSHOT_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_SNAPSHOT_LENGTH - 1).trimEnd()}…`;
}

/** Inserts a new highlight, generating its id and timestamps, and returns the row. */
export async function insertHighlight(input: NewHighlight): Promise<Highlight> {
  const db = await getDatabase();
  const now = Date.now();
  const highlight: Highlight = {
    id: randomUUID(),
    bookId: input.bookId,
    anchor: input.anchor,
    color: input.color,
    text: boundSnapshot(input.text),
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO highlights (${ALL_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    highlight.id,
    highlight.bookId,
    highlight.anchor,
    highlight.color,
    highlight.text,
    highlight.note,
    highlight.createdAt,
    highlight.updatedAt,
  );

  return highlight;
}

/** All highlights for a book, most recently created first. */
export async function getHighlightsForBook(bookId: string): Promise<Highlight[]> {
  const db = await getDatabase();
  return db.getAllAsync<Highlight>(
    `SELECT ${ALL_COLUMNS} FROM highlights WHERE bookId = ? ORDER BY createdAt DESC`,
    bookId,
  );
}

/** Updates the note on a highlight (null clears it) and bumps `updatedAt`. */
export async function updateHighlightNote(id: string, note: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE highlights SET note = ?, updatedAt = ? WHERE id = ?',
    note,
    Date.now(),
    id,
  );
}

/** Changes a highlight's colour token and bumps `updatedAt`. */
export async function updateHighlightColor(id: string, color: HighlightColorKey): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE highlights SET color = ?, updatedAt = ? WHERE id = ?',
    color,
    Date.now(),
    id,
  );
}

/** Deletes a single highlight by id. */
export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM highlights WHERE id = ?', id);
}

/** Deletes every highlight belonging to a book (cascade on book removal). */
export async function deleteHighlightsForBook(bookId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM highlights WHERE bookId = ?', bookId);
}
