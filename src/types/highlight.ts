/**
 * A persistent highlight (Phase 15), optionally carrying a note.
 *
 * Storage rules (see docs/ARCHITECTURE.md):
 * - `anchor` is an OPAQUE, per-format token (EPUB cfiRange; PDF page+rect if ever
 *   supported). It is never parsed or unified outside the matching reader engine
 *   — exactly like a reading position (golden rule #5).
 * - `color` is a palette token KEY (see src/theme/highlight-colors.ts), never a
 *   raw CSS colour, so the active theme can map it to a mode-appropriate shade.
 * - `text` is a small snapshot of the selected text, kept only so the highlights
 *   list is readable. Book content otherwise never lives in the database.
 */
export type HighlightColorKey = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface Highlight {
  id: string;
  bookId: string;
  /** Opaque per-format anchor (EPUB cfiRange). Never interpreted app-side. */
  anchor: string;
  /** Palette token key, resolved to a CSS colour by the active theme. */
  color: HighlightColorKey;
  /** Snapshot of the selected text, shown in the highlights list. */
  text: string;
  /** Optional user note attached to the highlight. Null when absent. */
  note: string | null;
  /** Epoch milliseconds when the highlight was created. */
  createdAt: number;
  /** Epoch milliseconds when the highlight (or its note/colour) last changed. */
  updatedAt: number;
}

/** Fields required to create a highlight; id/timestamps are generated on insert. */
export type NewHighlight = Pick<Highlight, 'bookId' | 'anchor' | 'color' | 'text'> & {
  /** Optional note supplied at creation time. */
  note?: string | null;
};
