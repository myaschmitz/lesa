/**
 * Named theme token sets, defined ONCE here and shared by app chrome and both
 * reader engines (see docs/ARCHITECTURE.md → "Theming"). A theme is a small
 * `{ background, text, ... }` token set; switching theme swaps the set. Engines
 * consume these tokens via {@link ReaderTheme} and never hardcode colours.
 */

import type { ReaderTheme } from '@/reader/types';

/** Selectable themes plus `system`, which follows the device light/dark scheme. */
export type ReaderThemeName = 'system' | 'light' | 'dark' | 'white' | 'black' | 'sepia';

/** A complete token set. Superset of {@link ReaderTheme} used by chrome + readers. */
export interface ThemeTokens {
  text: string;
  textSecondary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  isDark: boolean;
}

/** The fixed themes a user can pick (excludes `system`, which resolves to one). */
export type ResolvedThemeName = Exclude<ReaderThemeName, 'system'>;

export const Themes: Record<ResolvedThemeName, ThemeTokens> = {
  light: {
    text: '#000000',
    textSecondary: '#60646C',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    isDark: false,
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#B0B4BA',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    isDark: true,
  },
  // Pure paper-white reading surface (warmer chrome than `light`).
  white: {
    text: '#1A1A1A',
    textSecondary: '#666666',
    background: '#FFFFFF',
    backgroundElement: '#F2F2F2',
    backgroundSelected: '#E4E4E4',
    isDark: false,
  },
  // True-black OLED reading surface.
  black: {
    text: '#E6E6E6',
    textSecondary: '#9A9A9A',
    background: '#000000',
    backgroundElement: '#161616',
    backgroundSelected: '#242424',
    isDark: true,
  },
  sepia: {
    text: '#5B4636',
    textSecondary: '#857157',
    background: '#FBF0D9',
    backgroundElement: '#F2E3C2',
    backgroundSelected: '#E8D6AC',
    isDark: false,
  },
};

/** Resolves a theme name to concrete tokens; `system` follows device dark mode. */
export function resolveThemeTokens(name: ReaderThemeName, deviceIsDark: boolean): ThemeTokens {
  if (name === 'system') return deviceIsDark ? Themes.dark : Themes.light;
  // Fall back gracefully if persisted state holds a renamed/unknown theme.
  return Themes[name] ?? (deviceIsDark ? Themes.dark : Themes.light);
}

/** Narrows a {@link ThemeTokens} set to the chrome-and-engine {@link ReaderTheme}. */
export function toReaderTheme(tokens: ThemeTokens): ReaderTheme {
  return {
    background: tokens.background,
    backgroundElement: tokens.backgroundElement,
    text: tokens.text,
    isDark: tokens.isDark,
  };
}

export const THEME_LABELS: Record<ReaderThemeName, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  white: 'White',
  black: 'Black',
  sepia: 'Sepia',
};
