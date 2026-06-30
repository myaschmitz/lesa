import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import type { ReaderProgress } from '@/reader';
import type { ThemeTokens } from '@/theme/themes';

const FADE_MS = 200;

interface Props {
  /** Theme tokens drive overlay colours so chrome matches all five themes. */
  tokens: ThemeTokens;
  /** Whether the chrome is shown; toggled by tapping the page background. */
  visible: boolean;
  title: string;
  progress?: ReaderProgress;
  onClose: () => void;
  onOpenSettings: () => void;
}

/**
 * Apple Books-style floating reader chrome: a title pill, a close button, a
 * settings FAB, and a page indicator. Presentational only — it owns no reading
 * logic and is engine-agnostic (the page indicator just renders the opaque-free
 * {@link ReaderProgress} the screen forwards). Fades in/out and respects
 * safe-area insets so the book underneath fills the screen.
 */
export function ReaderChrome({ tokens, visible, title, progress, onClose, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  // Solid fills (not the page) so controls stay legible over any background.
  const pillBg = tokens.backgroundElement;
  const label = formatProgress(progress);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
    >
      <View style={[styles.topRow, { paddingTop: insets.top + Spacing.two }]}>
        <View style={[styles.pill, { backgroundColor: pillBg }]}>
          <Text numberOfLines={1} style={[styles.title, { color: tokens.text }]}>
            {title}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={Spacing.three}
          accessibilityLabel="Close book"
          style={[styles.circle, styles.topRight, { backgroundColor: pillBg }]}
        >
          <SymbolView
            name="xmark"
            size={18}
            tintColor={tokens.text}
            fallback={<Text style={[styles.glyph, { color: tokens.text }]}>✕</Text>}
          />
        </Pressable>
      </View>

      <View style={[styles.bottomRow, { paddingBottom: insets.bottom + Spacing.two }]}>
        {label ? (
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <Text style={[styles.indicator, { color: tokens.textSecondary }]}>{label}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onOpenSettings}
          hitSlop={Spacing.two}
          accessibilityLabel="Reading settings"
          style={[styles.fab, styles.bottomRight, { backgroundColor: pillBg }]}
        >
          <SymbolView
            name="textformat.size"
            size={22}
            tintColor={tokens.text}
            fallback={<Text style={[styles.glyph, { color: tokens.text }]}>Aa</Text>}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** "Page X of Y" for PDFs; rounded percent for EPUBs; nothing if unknown. */
function formatProgress(progress?: ReaderProgress): string | null {
  if (!progress) return null;
  if (progress.pageCount && progress.page) return `Page ${progress.page} of ${progress.pageCount}`;
  if (typeof progress.fraction === 'number') return `${Math.round(progress.fraction * 100)}%`;
  return null;
}

const SIZE = 44;

const styles = StyleSheet.create({
  root: { justifyContent: 'space-between' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  topRight: {
    position: 'absolute',
    right: Spacing.three,
    transform: [{ translateY: Spacing.two }],
  },
  bottomRight: { position: 'absolute', right: Spacing.three },
  pill: {
    maxWidth: '70%',
    borderRadius: SIZE / 2,
    paddingHorizontal: Spacing.three,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '600' },
  indicator: { fontSize: 13, fontWeight: '600' },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 17, fontWeight: '700' },
});
