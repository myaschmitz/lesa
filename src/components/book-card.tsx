import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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

export function BookCard({ book, onPress, onLongPress }: BookCardProps) {
  const accent = FORMAT_COLORS[book.format];

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(book)}
      onLongPress={() => onLongPress(book)}
    >
      <View style={[styles.cover, { backgroundColor: accent }]}>
        <ThemedText style={styles.coverTitle} numberOfLines={4}>
          {book.title}
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{book.format.toUpperCase()}</ThemedText>
        </View>
      </View>
      <ThemedText type="small" numberOfLines={2} style={styles.title}>
        {book.title}
      </ThemedText>
      {book.author ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {book.author}
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
  title: {
    marginTop: Spacing.half,
  },
});
