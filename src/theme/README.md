# `src/theme`

Design tokens defined once (light, dark, white, black, sepia) so app chrome and
both reader engines stay visually consistent. A theme is a `{ background, text,
... }` token set; `system` follows the device light/dark scheme.

- `themes.ts` — the five token sets, `ReaderThemeName`, and resolvers
  (`resolveThemeTokens`, `toReaderTheme`). Chrome uses `useTheme()`; the reader
  uses `useReaderTheme()`; both resolve the user's selected theme from settings.
- `typography.ts` — EPUB font family / size / line-height options + defaults.
  PDF is fixed-layout and ignores these.
