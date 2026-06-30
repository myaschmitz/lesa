import { create } from 'zustand';

import {
  deleteHighlight,
  getHighlightsForBook,
  insertHighlight,
  updateHighlightColor,
  updateHighlightNote,
} from '@/db/highlights';
import type { Highlight, HighlightColorKey, NewHighlight } from '@/types/highlight';

interface HighlightsState {
  /** Highlights for the book currently open in the reader. */
  byBook: Record<string, Highlight[]>;
  /** Which book id `byBook` was last loaded for; guards stale renders. */
  loadedBookId: string | null;
  error: string | null;
  /** Loads (and caches) the highlights for a book. */
  loadForBook: (bookId: string) => Promise<void>;
  /** Creates a highlight and returns it (so the caller can paint immediately). */
  add: (input: NewHighlight) => Promise<Highlight | null>;
  /** Sets/clears the note on a highlight. */
  setNote: (id: string, note: string | null) => Promise<void>;
  /** Changes a highlight's colour token. */
  setColor: (id: string, color: HighlightColorKey) => Promise<void>;
  /** Removes a highlight. */
  remove: (id: string) => Promise<void>;
  /** Convenience selector for the loaded book's highlights. */
  highlightsFor: (bookId: string) => Highlight[];
}

export const useHighlightsStore = create<HighlightsState>((set, get) => ({
  byBook: {},
  loadedBookId: null,
  error: null,

  loadForBook: async (bookId: string) => {
    try {
      const rows = await getHighlightsForBook(bookId);
      set((s) => ({ byBook: { ...s.byBook, [bookId]: rows }, loadedBookId: bookId, error: null }));
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  add: async (input: NewHighlight) => {
    try {
      const row = await insertHighlight(input);
      set((s) => ({
        byBook: { ...s.byBook, [input.bookId]: [row, ...(s.byBook[input.bookId] ?? [])] },
      }));
      return row;
    } catch (error) {
      set({ error: errorMessage(error) });
      return null;
    }
  },

  setNote: async (id: string, note: string | null) => {
    const next = note && note.trim().length > 0 ? note.trim() : null;
    try {
      await updateHighlightNote(id, next);
      set((s) => ({ byBook: mapRow(s.byBook, id, (h) => ({ ...h, note: next })) }));
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  setColor: async (id: string, color: HighlightColorKey) => {
    try {
      await updateHighlightColor(id, color);
      set((s) => ({ byBook: mapRow(s.byBook, id, (h) => ({ ...h, color })) }));
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  remove: async (id: string) => {
    try {
      await deleteHighlight(id);
      set((s) => {
        const byBook: Record<string, Highlight[]> = {};
        for (const [book, rows] of Object.entries(s.byBook)) {
          byBook[book] = rows.filter((h) => h.id !== id);
        }
        return { byBook };
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  highlightsFor: (bookId: string) => get().byBook[bookId] ?? [],
}));

/** Applies `fn` to whichever book row list contains the highlight `id`. */
function mapRow(
  byBook: Record<string, Highlight[]>,
  id: string,
  fn: (h: Highlight) => Highlight,
): Record<string, Highlight[]> {
  const next: Record<string, Highlight[]> = {};
  for (const [book, rows] of Object.entries(byBook)) {
    next[book] = rows.map((h) => (h.id === id ? fn(h) : h));
  }
  return next;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
