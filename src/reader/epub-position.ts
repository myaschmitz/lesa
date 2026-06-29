/**
 * The EPUB position token. It is OPAQUE to the rest of the app — only
 * {@link EpubReader} serializes and parses it — and is never unified with the
 * PDF page+offset token (see docs/ARCHITECTURE.md). EPUB positions are epub.js
 * CFIs, which point at a precise spot in reflowable content regardless of font
 * size or device, so they survive typography and screen changes.
 */
export interface EpubPosition {
  /** epub.js Canonical Fragment Identifier, e.g. `epubcfi(/6/4!/4/2/2[id]/1:0)`. */
  cfi: string;
}

/** Serializes a position into the opaque token stored in `books.lastPosition`. */
export function serializeEpubPosition(position: EpubPosition): string {
  return JSON.stringify(position);
}

/** Parses a stored token back into a position, tolerating null/garbage input. */
export function parseEpubPosition(token: string | null | undefined): EpubPosition | null {
  if (!token) return null;

  try {
    const parsed = JSON.parse(token) as Partial<EpubPosition>;
    if (typeof parsed.cfi !== 'string' || parsed.cfi.length === 0) return null;
    return { cfi: parsed.cfi };
  } catch {
    return null;
  }
}
