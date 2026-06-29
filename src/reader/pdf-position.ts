/**
 * The PDF position token. It is OPAQUE to the rest of the app — only
 * {@link PdfReader} serializes and parses it — and is never unified with the
 * EPUB locator (see docs/ARCHITECTURE.md). Page granularity matches what the
 * underlying PDFKit engine reports.
 */
export interface PdfPosition {
  /** Zero-based page index. */
  page: number;
  /**
   * Reserved for a future engine that can report sub-page scroll (0..1). The
   * current engine is page-granular, so this is normally absent.
   */
  offset?: number;
}

/** Serializes a position into the opaque token stored in `books.lastPosition`. */
export function serializePdfPosition(position: PdfPosition): string {
  return JSON.stringify(position);
}

/** Parses a stored token back into a position, tolerating null/garbage input. */
export function parsePdfPosition(token: string | null | undefined): PdfPosition | null {
  if (!token) return null;

  try {
    const parsed = JSON.parse(token) as Partial<PdfPosition>;
    if (typeof parsed.page !== 'number' || !Number.isFinite(parsed.page)) return null;

    const page = Math.max(0, Math.floor(parsed.page));
    const offset = typeof parsed.offset === 'number' ? parsed.offset : undefined;
    return offset === undefined ? { page } : { page, offset };
  } catch {
    return null;
  }
}
