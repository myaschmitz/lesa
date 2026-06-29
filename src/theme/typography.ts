/**
 * EPUB typography options shared by the settings UI and the EPUB engine. PDF is
 * fixed-layout and ignores all of these (its geometry is baked into the file).
 */

import type { ReaderTypography } from '@/reader/types';

export interface FontFamilyOption {
  id: string;
  label: string;
  /** CSS font-family value handed to epub.js; system fonts keep weight tiny. */
  value: string;
}

/** Built-in iOS system fonts — no bundled font assets needed. */
export const FONT_FAMILIES: FontFamilyOption[] = [
  { id: 'serif', label: 'Serif', value: 'Georgia, "Times New Roman", ui-serif, serif' },
  { id: 'sans', label: 'Sans', value: '-apple-system, system-ui, sans-serif' },
  { id: 'rounded', label: 'Rounded', value: 'ui-rounded, system-ui, sans-serif' },
  { id: 'mono', label: 'Mono', value: 'ui-monospace, Menlo, monospace' },
];

/** Font size as a percentage of the book's base size; epub.js wants "120%". */
export const FONT_SIZE_MIN = 80;
export const FONT_SIZE_MAX = 200;
export const FONT_SIZE_STEP = 10;

export const LINE_HEIGHT_MIN = 1.2;
export const LINE_HEIGHT_MAX = 2.2;
export const LINE_HEIGHT_STEP = 0.1;

export const DEFAULT_TYPOGRAPHY: ReaderTypography = {
  fontFamily: FONT_FAMILIES[0].value,
  fontSize: 100,
  lineHeight: 1.5,
};

export function fontSizeToCss(percent: number): string {
  return `${Math.round(percent)}%`;
}
