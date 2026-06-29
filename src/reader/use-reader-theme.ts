import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { ReaderTheme } from './types';

/**
 * Builds a minimal {@link ReaderTheme} from the app's light/dark colour scheme so
 * the reader engines stay visually consistent with the chrome without hardcoding
 * colours. Full theming (sepia, white, black) lands in the reader-settings phase.
 */
export function useReaderTheme(): ReaderTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return {
    background: colors.background,
    text: colors.text,
    isDark,
  };
}
