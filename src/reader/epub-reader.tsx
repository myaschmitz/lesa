import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import type { ReaderViewProps } from './types';

/**
 * Stand-in for the EPUB engine, which lands in Phase 4. Keeps the
 * {@link ReaderView} dispatcher total over every {@link BookFormat} so screens
 * never branch on format themselves.
 */
export function EpubReader({ theme }: ReaderViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="subtitle" style={styles.text}>
        EPUB reading is coming in a later update.
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        This book is saved on your device and will open here once the EPUB reader ships.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
