import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import {
  HIGHLIGHT_COLOR_KEYS,
  highlightColorLabel,
  highlightSwatchColor,
} from '@/theme/highlight-colors';
import type { ThemeTokens } from '@/theme/themes';
import type { HighlightColorKey } from '@/types/highlight';

const FADE_MS = 150;

interface Props {
  tokens: ThemeTokens;
  /** Shown while a text selection is pending a highlight decision. */
  visible: boolean;
  /** Pick a colour → create the highlight immediately. */
  onPick: (color: HighlightColorKey) => void;
  /** Create a highlight (default colour) and open its note editor. */
  onAddNote: () => void;
  /** Dismiss without highlighting. */
  onDismiss: () => void;
}

/**
 * Floating colour picker shown when the user has selected text and may turn it
 * into a saved highlight. It sits at the bottom so it doesn't fight the iOS
 * native selection menu (Copy / Look Up / Share) that Phase 14 preserves. Purely
 * presentational — the screen owns the pending selection and persistence.
 */
export function HighlightColorBar({ tokens, visible, onPick, onAddNote, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.root, { paddingBottom: insets.bottom + Spacing.three, opacity }]}
    >
      <View style={[styles.bar, { backgroundColor: tokens.backgroundElement }]}>
        {HIGHLIGHT_COLOR_KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityLabel={`Highlight ${highlightColorLabel(key)}`}
            hitSlop={Spacing.two}
            onPress={() => onPick(key)}
            style={[styles.swatch, { backgroundColor: highlightSwatchColor(key) }]}
          />
        ))}
        <View style={[styles.divider, { backgroundColor: tokens.backgroundSelected }]} />
        <Pressable
          accessibilityLabel="Highlight and add note"
          hitSlop={Spacing.two}
          onPress={onAddNote}
          style={styles.action}
        >
          <SymbolView
            name="note.text"
            size={20}
            tintColor={tokens.text}
            fallback={<Text style={[styles.glyph, { color: tokens.text }]}>＋</Text>}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Dismiss"
          hitSlop={Spacing.two}
          onPress={onDismiss}
          style={styles.action}
        >
          <SymbolView
            name="xmark"
            size={16}
            tintColor={tokens.textSecondary}
            fallback={<Text style={[styles.glyph, { color: tokens.textSecondary }]}>✕</Text>}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const SWATCH = 30;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SWATCH,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
  },
  divider: {
    width: 1,
    height: SWATCH,
    marginHorizontal: Spacing.one,
  },
  action: {
    width: SWATCH,
    height: SWATCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 17, fontWeight: '700' },
});
