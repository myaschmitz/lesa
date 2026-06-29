import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { bookFileExists, toAbsoluteUri } from '@/library/paths';
import { ReaderView, useReaderTheme } from '@/reader';
import { useLibraryStore } from '@/store/library-store';
import type { Book } from '@/types/book';

const POSITION_SAVE_DEBOUNCE_MS = 800;

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; book: Book; absolutePath: string };

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useReaderTheme();
  const books = useLibraryStore((s) => s.books);
  const loadBook = useLibraryStore((s) => s.loadBook);
  const markOpened = useLibraryStore((s) => s.markOpened);
  const saveReadingPosition = useLibraryStore((s) => s.saveReadingPosition);

  const [book, setBook] = useState<Book | null>(() => books.find((b) => b.id === id) ?? null);
  const [notFound, setNotFound] = useState(false);
  const [ready, setReady] = useState(false);

  // Cold start / deep link: the catalog may not be in memory yet, so resolve the
  // book through the store (which falls back to the database).
  useEffect(() => {
    if (book || !id) return;
    let active = true;
    void loadBook(id).then((row) => {
      if (!active) return;
      if (row) setBook(row);
      else setNotFound(true);
    });
    return () => {
      active = false;
    };
  }, [id, book, loadBook]);

  // Record the open once we know the book (used for last-read ordering later).
  useEffect(() => {
    if (book) void markOpened(book.id);
  }, [book, markOpened]);

  const { debounced: persistPosition } = useDebouncedCallback((position: string) => {
    if (book) void saveReadingPosition(book.id, position);
  }, POSITION_SAVE_DEBOUNCE_MS);

  const state: LoadState = useMemo(() => {
    if (notFound) return { status: 'missing' };
    if (!book) return { status: 'loading' };
    if (!bookFileExists(book.relativePath)) return { status: 'missing' };
    return { status: 'ready', book, absolutePath: toAbsoluteUri(book.relativePath) };
  }, [book, notFound]);

  const showLoadingOverlay =
    state.status === 'loading' ||
    (state.status === 'ready' && state.book.format === 'pdf' && !ready);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: 'Library',
          title: book?.title ?? 'Reader',
        }}
      />

      {state.status === 'ready' ? (
        <ReaderView
          format={state.book.format}
          absolutePath={state.absolutePath}
          initialPosition={state.book.lastPosition ?? undefined}
          theme={theme}
          onPositionChange={persistPosition}
          onReady={() => setReady(true)}
        />
      ) : null}

      {state.status === 'missing' ? <MissingState /> : null}

      {showLoadingOverlay ? (
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.text} />
        </View>
      ) : null}
    </View>
  );
}

function MissingState() {
  const router = useRouter();

  return (
    <View style={styles.centered}>
      <ThemedText type="subtitle" style={styles.centeredText}>
        Couldn&apos;t open this book
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centeredText}>
        Its file is no longer on this device. Try importing it again.
      </ThemedText>
      <Pressable onPress={() => router.back()}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Back to Library
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
});
