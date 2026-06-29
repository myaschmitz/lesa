import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ReaderThemeName } from '@/theme/themes';
import {
  DEFAULT_TYPOGRAPHY,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
} from '@/theme/typography';

import { settingsStorage } from './settings-storage';

/** How PDFs scale to the viewport (fixed-layout: this is the only "zoom"). */
export type PdfFit = 'width' | 'height' | 'both';

interface SettingsState {
  /** Global reader theme; `system` follows device light/dark. */
  themeName: ReaderThemeName;
  /** EPUB-only. PDFs ignore typography. */
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  /** PDF: page-snap vs free scroll. */
  pdfPaging: boolean;
  /** PDF: how the page scales to the viewport. */
  pdfFit: PdfFit;

  setThemeName: (name: ReaderThemeName) => void;
  setFontFamily: (value: string) => void;
  setFontSize: (percent: number) => void;
  setLineHeight: (value: number) => void;
  setPdfPaging: (paging: boolean) => void;
  setPdfFit: (fit: PdfFit) => void;
  /** Restore all reader prefs to their defaults (theme, typography, PDF). */
  resetAll: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DEFAULTS = {
  themeName: 'system' as ReaderThemeName,
  fontFamily: DEFAULT_TYPOGRAPHY.fontFamily,
  fontSize: DEFAULT_TYPOGRAPHY.fontSize,
  lineHeight: DEFAULT_TYPOGRAPHY.lineHeight,
  pdfPaging: false,
  pdfFit: 'width' as PdfFit,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setThemeName: (themeName) => set({ themeName }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (percent) => set({ fontSize: clamp(percent, FONT_SIZE_MIN, FONT_SIZE_MAX) }),
      setLineHeight: (value) => set({ lineHeight: clamp(value, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX) }),
      setPdfPaging: (pdfPaging) => set({ pdfPaging }),
      setPdfFit: (pdfFit) => set({ pdfFit }),
      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'reader-settings',
      version: 1,
      storage: createJSONStorage(() => settingsStorage),
    },
  ),
);
