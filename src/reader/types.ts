/**
 * The engine-agnostic reader contract (see docs/ARCHITECTURE.md → "The reader
 * abstraction"). App screens render a {@link ReaderView} and depend ONLY on the
 * types in this file — never on epub.js, Readium, or a PDF library directly.
 * Swapping or adding a rendering engine must be a one-file change inside
 * `src/reader`.
 */

/**
 * Visual tokens shared by app chrome and both reader engines. Kept deliberately
 * small for Phase 3; full theming (sepia, white, black, typography) lands in the
 * reader-settings phase. Engines must derive their look from these tokens rather
 * than hardcoding colours.
 */
export interface ReaderTheme {
  /** Page / canvas background colour. */
  background: string;
  /** Solid fill for floating controls (pills/buttons) so they stay legible. */
  backgroundElement: string;
  /** Foreground colour for reader chrome (loading states, messages). */
  text: string;
  /** Whether this is a dark theme; engines use it to pick a matching tint. */
  isDark: boolean;
}

/**
 * Typography controls. Reflowable formats (EPUB) honour these; fixed-layout
 * formats (PDF) ignore them — a PDF's page geometry is baked in.
 */
export interface ReaderTypography {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

/**
 * Display-only reading progress for the immersive chrome's page indicator. This
 * is deliberately separate from the opaque {@link ReaderViewProps.initialPosition}
 * token: PDFs report exact 1-based page + count, EPUBs (reflowable) report a
 * fractional 0–1 progress. Either may be absent for the format that can't supply
 * it; the indicator renders "Page X of Y" when pages are known, else a percent.
 */
export interface ReaderProgress {
  /** PDF: current 1-based page. EPUB: undefined (no fixed pagination). */
  page?: number;
  /** PDF: total pages. EPUB: undefined. */
  pageCount?: number;
  /** EPUB: fractional progress through the book, 0–1. PDF: undefined. */
  fraction?: number;
}

/**
 * An engine-neutral highlight the reader should render. `anchor` is an OPAQUE,
 * per-format token (EPUB cfiRange; PDF page+rect if ever supported) — the engine
 * is the only code that understands it, and it is never unified across engines
 * (see docs/ARCHITECTURE.md → golden rule #5). `color` is an already-resolved CSS
 * colour: the engine paints exactly this and stays unaware of palette tokens,
 * notes, or persistence (all owned by the screen).
 */
export interface ReaderHighlight {
  /** App-owned id, stashed with the engine annotation so a press maps back. */
  id: string;
  /** Opaque per-format anchor identifying the highlighted range. */
  anchor: string;
  /** Resolved CSS colour the engine paints the highlight in. */
  color: string;
}

/**
 * Props every engine implementation accepts. `initialPosition` and the value
 * passed to `onPositionChange` are OPAQUE, per-format tokens: only the matching
 * engine knows their shape (PDF = page+offset, EPUB = locator/CFI). They are
 * never parsed or unified outside their engine.
 */
export interface ReaderViewProps {
  /** Absolute on-device URI, rebuilt at runtime from the stored relative path. */
  absolutePath: string;
  /** Opaque per-format position token to restore, if any. */
  initialPosition?: string;
  theme: ReaderTheme;
  /** EPUB only; ignored by fixed-layout engines such as PDF. */
  typography?: ReaderTypography;
  /**
   * Whether the immersive chrome is currently shown. Engines mirror it for any
   * in-content controls (e.g. the EPUB Chapters button) so everything hides
   * together for a clean reading view. Defaults to shown.
   */
  controlsVisible?: boolean;
  /**
   * A deliberate single tap on the content (not a scroll or swipe). Each engine
   * detects this with its own gesture recognizer — epub.js distinguishes taps
   * from scrolls inside its WebView, PDFKit via a parent tap recogniser — so the
   * screen can toggle the immersive chrome without a swipe ever flashing it.
   */
  onTap?: () => void;
  /** Emits an opaque per-format position token as the reading position changes. */
  onPositionChange: (position: string) => void;
  /** Display-only progress for the page indicator; never used for persistence. */
  onProgress?: (progress: ReaderProgress) => void;
  /**
   * EPUB only: emits the book cover as a base64 data URL once available, so the
   * library can persist it. Fixed-layout engines (PDF) never call this.
   */
  onCoverExtracted?: (dataUrl: string) => void;
  /** Called once the document has loaded and is ready to read. */
  onReady?: () => void;
  /**
   * Persistent highlights the engine should currently render (Phase 15). The
   * engine diffs this set against what it has painted and adds/removes/recolours
   * accordingly. Engine-neutral: anchors are opaque and colours are pre-resolved.
   * Engines that can't render highlights (e.g. PDF today) ignore this.
   */
  highlights?: ReaderHighlight[];
  /**
   * The user selected text that could become a highlight. `anchor` is the opaque
   * per-format token for the selection; the screen turns this into a saved
   * highlight after the user picks a colour. Engines without selection ignore it.
   */
  onSelectionForHighlight?: (text: string, anchor: string) => void;
  /** An existing rendered highlight was tapped; identified by its app id. */
  onPressHighlight?: (id: string) => void;
  /**
   * Declarative jump request used by the highlights list: when `nonce` changes
   * the engine navigates to `anchor`. The nonce lets the same anchor be
   * re-targeted. `anchor` is opaque; engines that can't navigate ignore it.
   */
  jumpTarget?: { anchor: string; nonce: number };
}
