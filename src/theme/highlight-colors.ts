/**
 * Highlight palette, defined ONCE here (golden rule: theme tokens live in one
 * place). Highlights are stored by token KEY — never raw CSS — so the active
 * theme maps a key to a mode-appropriate paint colour. Light surfaces (light,
 * white, sepia) and dark surfaces (dark, black) need different shades for a
 * highlight to read at the engine's paint opacity.
 *
 * The reader engines receive an already-resolved CSS colour (golden rule #4):
 * they paint what they're given and stay unaware of this palette.
 */

import type { HighlightColorKey } from '@/types/highlight';

/** Opacity the engine paints highlights at; chosen so colours read on all themes. */
export const HIGHLIGHT_PAINT_OPACITY = 0.35;

interface HighlightSwatch {
  /** Human label for accessibility. */
  label: string;
  /** Solid chip colour shown in the picker UI. */
  swatch: string;
  /** Paint colour over light surfaces (light / white / sepia). */
  light: string;
  /** Paint colour over dark surfaces (dark / black). */
  dark: string;
}

const PALETTE: Record<HighlightColorKey, HighlightSwatch> = {
  yellow: { label: 'Yellow', swatch: '#FFD54A', light: '#FFD54A', dark: '#E6C200' },
  green: { label: 'Green', swatch: '#A5D66A', light: '#A5D66A', dark: '#6FBF3B' },
  blue: { label: 'Blue', swatch: '#7FC4F2', light: '#7FC4F2', dark: '#4FA8E0' },
  pink: { label: 'Pink', swatch: '#F4A3C0', light: '#F4A3C0', dark: '#E06A99' },
  orange: { label: 'Orange', swatch: '#F6B85C', light: '#F6B85C', dark: '#E0913B' },
};

/** Ordered keys for stable rendering of the picker. */
export const HIGHLIGHT_COLOR_KEYS: HighlightColorKey[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'orange',
];

/** The default colour applied when a user highlights without choosing one. */
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColorKey = 'yellow';

/** Solid chip colour for the picker / list swatch. */
export function highlightSwatchColor(key: HighlightColorKey): string {
  return (PALETTE[key] ?? PALETTE[DEFAULT_HIGHLIGHT_COLOR]).swatch;
}

/** Accessible label for a colour key. */
export function highlightColorLabel(key: HighlightColorKey): string {
  return (PALETTE[key] ?? PALETTE[DEFAULT_HIGHLIGHT_COLOR]).label;
}

/**
 * Resolves a colour key to the CSS paint colour for the current surface. The
 * engine combines this with {@link HIGHLIGHT_PAINT_OPACITY}. Falls back to the
 * default colour for any unknown/legacy key.
 */
export function resolveHighlightPaintColor(key: HighlightColorKey, isDark: boolean): string {
  const swatch = PALETTE[key] ?? PALETTE[DEFAULT_HIGHLIGHT_COLOR];
  return isDark ? swatch.dark : swatch.light;
}
