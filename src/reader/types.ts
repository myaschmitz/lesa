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
  /** Emits an opaque per-format position token as the reading position changes. */
  onPositionChange: (position: string) => void;
  /** Called once the document has loaded and is ready to read. */
  onReady?: () => void;
}
