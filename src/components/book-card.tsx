import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { toAbsoluteUri } from '@/library/paths';
import type { Book } from '@/types/book';

type BookCardProps = {
  book: Book;
  onPress: (book: Book) => void;
  onLongPress: (book: Book) => void;
};

const FORMAT_COLORS: Record<Book['format'], string> = {
  epub: '#7C5CFF',
  pdf: '#E5484D',
};

/** Normalizes stored progress to 0–1, or null when there's nothing to show. */
function clampProgress(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(1, value);
}

export function BookCard({ book, onPress, onLongPress }: BookCardProps) {
  const accent = FORMAT_COLORS[book.format];
  const coverUri = book.coverRelativePath ? toAbsoluteUri(book.coverRelativePath) : null;
  const progress = clampProgress(book.progress);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(book)}
      onLongPress={() => onLongPress(book)}
    >
      <View style={[styles.cover, { backgroundColor: accent }]}>
        {coverUri ? (
          <Image
            style={StyleSheet.absoluteFill}
            source={{ uri: coverUri }}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        ) : (
          <ThemedText style={styles.coverTitle} numberOfLines={4}>
            {book.title}
          </ThemedText>
        )}
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{book.format.toUpperCase()}</ThemedText>
        </View>
        {progress !== null ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        ) : null}
      </View>
      <ThemedText type="small" numberOfLines={2} style={styles.title}>
        {book.title}
      </ThemedText>
      {book.author ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {book.author}
        </ThemedText>
      ) : progress !== null ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {Math.round(progress * 100)}% read
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginTop: Spacing.half,
  },
});
