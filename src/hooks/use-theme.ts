/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settings-store';
import { resolveThemeTokens } from '@/theme/themes';

/**
 * App-chrome theme tokens. Follows the same selected theme as the reader so
 * chrome and engines stay visually consistent; `system` follows the device.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const themeName = useSettingsStore((s) => s.themeName);
  return resolveThemeTokens(themeName, scheme === 'dark');
}
