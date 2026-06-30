import { create } from 'zustand';

import {
  deleteBook,
  getAllBooks,
  getBookById,
  updateCover,
  updateLastOpenedAt,
  updateLastPosition,
  updateProgress,
} from '@/db/books';
import { deleteHighlightsForBook } from '@/db/highlights';
import { confirmDuplicate } from '@/library/duplicate-prompt';
import { saveCoverDataUrl } from '@/library/covers';
import {
  findDuplicateFor,
  importCandidate,
  pickBooks,
  type ImportCandidate,
} from '@/library/import';
import { candidateFromUri, cleanupIncomingFile } from '@/library/incoming';
import { deleteBookFile, deleteCoverFile } from '@/library/paths';
import { reconcileCatalog } from '@/library/reconcile';
import type { Book } from '@/types/book';

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LibraryState {
  books: Book[];
  status: LibraryStatus;
  error: string | null;
  importing: boolean;
  /** Reconcile the catalog against disk, then load it. Run once at launch. */
  init: () => Promise<void>;
  /** Reload the catalog from the database. */
  refresh: () => Promise<void>;
  /** Dismiss the current error message. */
  clearError: () => void;
  /** Open the document picker and import the chosen books. */
  importFromPicker: () => Promise<number>;
  /** Import a book handed off via the share sheet / "Open in Lesa". */
  importUri: (uri: string) => Promise<number>;
  /** Remove a book: delete its file, then its catalog row. */
  removeBook: (id: string) => Promise<void>;
  /** Resolve a single book by id, preferring the in-memory catalog. */
  loadBook: (id: string) => Promise<Book | null>;
  /** Record that a book was opened now (for last-read ordering). */
  markOpened: (id: string) => Promise<void>;
  /** Persist a reader's opaque position token for a book. */
  saveReadingPosition: (id: string, position: string) => Promise<void>;
  /** Persist an extracted cover (base64 data URL) for a book. */
  saveCover: (id: string, dataUrl: string) => Promise<void>;
  /** Persist display-only reading progress (0–1) for a book. */
  saveProgress: (id: string, fraction: number) => Promise<void>;
}

/** Imports candidates, prompting on likely duplicates. Returns count imported. */
async function importCandidates(candidates: ImportCandidate[]): Promise<number> {
  let imported = 0;
  for (const candidate of candidates) {
    const existing = await findDuplicateFor(candidate);
    if (existing) {
      const decision = await confirmDuplicate(existing, candidate);
      if (decision === 'keep') continue;
    }
    await importCandidate(candidate);
    imported += 1;
  }
  return imported;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  status: 'idle',
  error: null,
  importing: false,

  init: async () => {
    set({ status: 'loading', error: null });
    try {
      const { present } = await reconcileCatalog();
      set({ books: present, status: 'ready' });
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) });
    }
  },

  refresh: async () => {
    try {
      const books = await getAllBooks();
      set({ books, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) });
    }
  },

  clearError: () => set({ error: null }),

  importFromPicker: async () => {
    set({ importing: true });
    try {
      const candidates = await pickBooks();
      const imported = await importCandidates(candidates);
      if (imported > 0) await get().refresh();
      return imported;
    } catch (error) {
      set({ error: errorMessage(error) });
      return 0;
    } finally {
      set({ importing: false });
    }
  },

  importUri: async (uri: string) => {
    const candidate = candidateFromUri(uri);
    if (!candidate) {
      return 0;
    }
    set({ importing: true });
    try {
      const imported = await importCandidates([candidate]);
      cleanupIncomingFile(uri);
      if (imported > 0) await get().refresh();
      return imported;
    } catch (error) {
      set({ error: errorMessage(error) });
      return 0;
    } finally {
      set({ importing: false });
    }
  },

  removeBook: async (id: string) => {
    const book = get().books.find((b) => b.id === id);
    try {
      if (book) {
        deleteBookFile(book.relativePath);
        deleteCoverFile(book.coverRelativePath);
      }
      await deleteHighlightsForBook(id);
      await deleteBook(id);
      set({ books: get().books.filter((b) => b.id !== id) });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  loadBook: async (id: string) => {
    const cached = get().books.find((b) => b.id === id);
    if (cached) return cached;
    try {
      return await getBookById(id);
    } catch (error) {
      set({ error: errorMessage(error) });
      return null;
    }
  },

  markOpened: async (id: string) => {
    const timestamp = Date.now();
    try {
      await updateLastOpenedAt(id, timestamp);
      set({
        books: get()
          .books.map((b) => (b.id === id ? { ...b, lastOpenedAt: timestamp } : b))
          .sort((a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt)),
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  saveReadingPosition: async (id: string, position: string) => {
    try {
      await updateLastPosition(id, position);
      set({
        books: get().books.map((b) => (b.id === id ? { ...b, lastPosition: position } : b)),
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  saveCover: async (id: string, dataUrl: string) => {
    try {
      const coverRelativePath = saveCoverDataUrl(id, dataUrl);
      if (!coverRelativePath) return;
      await updateCover(id, coverRelativePath);
      set({ books: get().books.map((b) => (b.id === id ? { ...b, coverRelativePath } : b)) });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  saveProgress: async (id: string, fraction: number) => {
    const clamped = Math.min(1, Math.max(0, fraction));
    try {
      await updateProgress(id, clamped);
      set({ books: get().books.map((b) => (b.id === id ? { ...b, progress: clamped } : b)) });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
}));

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
