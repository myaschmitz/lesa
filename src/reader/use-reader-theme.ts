import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settings-store';
import { resolveThemeTokens, toReaderTheme } from '@/theme/themes';
import { DEFAULT_TYPOGRAPHY } from '@/theme/typography';

import type { ReaderTheme, ReaderTypography } from './types';

/**
 * Resolves the user's selected reader theme to {@link ReaderTheme} tokens. The
 * `system` theme follows the device light/dark scheme; every other theme is
 * explicit. Tokens are defined once in `src/theme` so chrome and engines match.
 */
export function useReaderTheme(): ReaderTheme {
  const scheme = useColorScheme();
  const themeName = useSettingsStore((s) => s.themeName);
  return toReaderTheme(resolveThemeTokens(themeName, scheme === 'dark'));
}

/** EPUB typography prefs (font family, size %, line height) from settings. */
export function useReaderTypography(): ReaderTypography {
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  return { fontFamily: fontFamily || DEFAULT_TYPOGRAPHY.fontFamily, fontSize, lineHeight };
}
